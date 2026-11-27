param(
    [string]$BaseUrl = 'http://localhost:3000/api/v1',
    [string]$Email,
    [string]$AccessToken,
    [string]$StaffId,
    [switch]$Bootstrap,
    [string]$DatabaseContainer = 'petcare-backend-postgres',
    [string]$DatabaseUser = 'petcare',
    [string]$DatabaseName = 'petcare',
    [datetime]$Date = (Get-Date).Date.AddDays(2)
)

$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')
$headers = @{}

function Invoke-PetCare([string]$Method, [string]$Path, $Body = $null) {
    $options = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = $headers; TimeoutSec = 30 }
    if ($null -ne $Body) {
        $options.ContentType = 'application/json; charset=utf-8'
        $options.Body = [Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 8))
    }
    $result = Invoke-RestMethod @options
    if ($result.success -ne $true) { throw "API failed: $Method $Path" }
    return $result.data
}

if ($Date.Date -le (Get-Date).Date) { throw 'Choose a future date, for example -Date 2026-11-25.' }
if ($Bootstrap) {
    if (([uri]$BaseUrl).Host -notin @('localhost', '127.0.0.1')) { throw 'Bootstrap chi danh cho Docker tren may local.' }
    if (-not $Email) { $Email = Read-Host 'Email nhan ma xac nhan cho tai khoan DEMO moi' }
    Write-Host 'Tao tai khoan quan tri va nhan vien DEMO moi. Tai khoan hien co giu nguyen.'
    $bootstrapPassword = $env:PETCARE_DEMO_PASSWORD
    if (-not $bootstrapPassword) {
        $securePassword = Read-Host 'Dat mat khau DEMO (it nhat 8 ky tu)' -AsSecureString
        $credential = New-Object System.Management.Automation.PSCredential($Email, $securePassword)
        $bootstrapPassword = $credential.GetNetworkCredential().Password
    }
    if ($bootstrapPassword.Length -lt 8) { throw 'Mat khau DEMO can it nhat 8 ky tu.' }
    try {
        $challenge = Invoke-PetCare 'POST' '/auth/register' @{ fullName = '[DEMO] Booking administrator'; email = $Email; password = $bootstrapPassword }
        $verificationCode = Read-Host 'Ma xac nhan trong email'
        $session = Invoke-PetCare 'POST' '/auth/register/verify' @{ email = $Email; challengeId = $challenge.challengeId; code = $verificationCode }
        $newId = ([guid]$session.user.id).ToString()
        # Only this newly registered account receives ADMIN; no existing role is changed.
        $sql = "INSERT INTO user_roles (user_id, role_id) SELECT '$newId'::uuid, id FROM roles WHERE name = 'ADMIN' ON CONFLICT DO NOTHING;"
        $sql | & docker exec -i $DatabaseContainer psql -U $DatabaseUser -d $DatabaseName -v ON_ERROR_STOP=1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Khong khoi tao duoc quyen DEMO. Kiem tra Docker va thong tin PostgreSQL.' }
        $session = Invoke-PetCare 'POST' '/auth/login' @{ email = $Email; password = $bootstrapPassword }
        $AccessToken = $session.accessToken
        $headers.Authorization = "Bearer $AccessToken"
        $demoStaff = Invoke-PetCare 'POST' '/staff' @{ userId = $newId; position = '[DEMO] Booking test staff'; bio = 'Demo only' }
        $StaffId = $demoStaff.id
        Write-Host "Tai khoan quan tri DEMO: $Email (mat khau ban vua nhap)"
    } finally { $bootstrapPassword = $null; $credential = $null; $securePassword = $null; $verificationCode = $null }
} elseif (-not $AccessToken) {
    if (-not $Email) { $Email = Read-Host 'Email tai khoan quan tri hien co' }
    $securePassword = Read-Host 'Mat khau (khong hien thi)' -AsSecureString
    $credential = New-Object System.Management.Automation.PSCredential($Email, $securePassword)
    try {
        $session = Invoke-PetCare 'POST' '/auth/login' @{ email = $Email; password = $credential.GetNetworkCredential().Password }
        $AccessToken = $session.accessToken
    } finally { $credential = $null; $securePassword = $null }
}
$headers.Authorization = "Bearer $AccessToken"

# Read permissions and existing data before creating anything.
$staff = @()
for ($page = 0; ; $page++) {
    $batch = Invoke-PetCare 'GET' "/staff?page=$page&size=50"
    $staff += @($batch.content | Where-Object { $_.isActive })
    if (($page + 1) * 50 -ge $batch.totalElements) { break }
}
if ($StaffId) { $selected = $staff | Where-Object { $_.id -eq $StaffId } | Select-Object -First 1 }
else { $selected = $staff | Select-Object -First 1 }
if (-not $selected) { throw 'Chua co nhan vien dang hoat dong. Tao ho so nhan vien truoc, hoac dung -StaffId ID_HIEN_CO.' }
$day = $Date.ToString('yyyy-MM-dd')
$schedules = @(Invoke-PetCare 'GET' "/schedules?staffId=$($selected.id)&dateFrom=$day&dateTo=$day")
if ($schedules.Count -gt 0 -and -not $schedules[0].isAvailable) {
    throw "Nhan vien da co ca nghi ngay $day. Chon ngay khac bang -Date YYYY-MM-DD."
}
$existingSkills = Invoke-PetCare 'GET' "/staff/$($selected.id)/skills"
$categories = @(Invoke-PetCare 'GET' '/services/categories')
$catalog = Invoke-PetCare 'GET' '/services?search=DEMO&size=50'
$serviceName = '[DEMO] Kham thu cung - 30 phut'
$service = $catalog.content | Where-Object { $_.name -eq $serviceName } | Select-Object -First 1
if (-not $service) {
    $category = $categories | Where-Object { $_.name -eq '[DEMO] Kiem thu dat lich' } | Select-Object -First 1
    if (-not $category) {
        $category = Invoke-PetCare 'POST' '/services/categories' @{ name = '[DEMO] Kiem thu dat lich'; description = 'Du lieu thu nghiem'; icon = 'Stethoscope' }
    }
    $service = Invoke-PetCare 'POST' '/services' @{
        name = $serviceName; categoryId = $category.id; description = 'DEMO: gia mau de thu dat lich, khong phai bang gia thuc te.'
        basePrice = 150000; durationMinutes = 30
    }
}
if (-not ($existingSkills.skills | Where-Object { $_.serviceId -eq $service.id })) {
    $null = Invoke-PetCare 'POST' "/staff/$($selected.id)/skills" @{ serviceIds = @($service.id); proficiencyLevel = 'INTERMEDIATE' }
}
if ($schedules.Count -eq 0) {
    $null = Invoke-PetCare 'POST' '/schedules' @{
        staffId = $selected.id; workDate = $day; startTime = '08:00:00'; endTime = '16:30:00'
        isAvailable = $true; slotDurationMinutes = 30
    }
}
$availability = Invoke-PetCare 'GET' "/schedules/slots/available?date=$day&serviceId=$($service.id)&staffId=$($selected.id)"
$slots = @($availability.staff | ForEach-Object { $_.slots } | Where-Object { $_.available })
if ($slots.Count -eq 0) { throw "Chua co o 30 phut con trong ngay $day. Thu ngay khac; script khong sua lich da co." }
Write-Host "OK: $serviceName | Gia DEMO: 150000 VND | Ngay: $day | So gio trong: $($slots.Count)"
Write-Host "Staff ID: $($selected.id) | Service ID: $($service.id)"
Write-Host "Mo http://localhost:3000, dang nhap khach hang, them thu cung, chon dich vu DEMO va ngay $day."
