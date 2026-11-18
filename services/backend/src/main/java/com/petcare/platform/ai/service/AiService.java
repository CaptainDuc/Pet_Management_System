package com.petcare.platform.ai.service;

import com.petcare.platform.pet.domain.Pet;
import com.petcare.platform.pet.repository.PetRepository;
import com.petcare.platform.servicecatalog.domain.CareService;
import com.petcare.platform.servicecatalog.repository.CareServiceRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class AiService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private static final List<String> BOOKING_KEYWORDS = List.of(
            "đặt lịch", "đặt hẹn", "book lịch", "hẹn khám", "lịch khám",
            "đăng ký khám", "muốn khám", "cho chó đi khám", "cho mèo đi khám"
    );
    private static final List<String> BOOKING_VERBS = List.of(
            "đặt", "book", "hẹn", "đăng ký", "muốn"
    );
    private static final List<String> BOOKABLE_SERVICES = List.of(
            "spa", "tắm", "groom", "cắt tỉa", "trông giữ", "dịch vụ",
            "khám", "tiêm", "xét nghiệm"
    );

    private final RestClient restClient;
    private final PetRepository petRepository;
    private final CareServiceRepository careServiceRepository;

    public AiService(@Value("${AI_RAG_URL:http://ai-rag:8002}") String ragUrl,
                     PetRepository petRepository,
                     CareServiceRepository careServiceRepository) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(120_000);
        this.restClient = RestClient.builder()
                .baseUrl(ragUrl)
                .requestFactory(factory)
                .build();
        this.petRepository = petRepository;
        this.careServiceRepository = careServiceRepository;
    }

    public Map<String, Object> getPetCareTip(UUID userId, String question) {
        if (question == null || question.isBlank()) {
            return Map.of(
                    "answer", "Vui lòng nhập câu hỏi về sức khỏe thú cưng.",
                    "status", "error"
            );
        }

        String q = question.trim();
        boolean guest = userId == null;
        List<Pet> pets = guest
                ? List.of()
                : petRepository.findByOwnerIdAndActiveTrue(userId);
        String role = guest ? "guest" : (pets.isEmpty() ? "customer_without_pet" : "customer");
        boolean bookingIntent = isBookingIntent(q);

        // Guest / customer chưa có thú cưng: chỉ chẩn đoán, không tạo phiếu đặt lịch.
        if (bookingIntent && !"customer".equals(role)) {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("role", role);
            result.put("mode", "diagnosis");
            result.put("status", "success");
            result.put("needsLogin", guest);
            result.put("answer", guest
                    ? "Bạn cần đăng nhập để đặt lịch. Ở chế độ khách, mình chỉ có thể tư vấn chẩn đoán "
                      + "và hướng dẫn chăm sóc thú cưng."
                    : "Bạn cần thêm hồ sơ thú cưng trước khi đặt lịch. Hãy vào mục \"Thú cưng của tôi\" "
                      + "để tạo hồ sơ, sau đó quay lại đặt lịch.");
            return result;
        }

        if (bookingIntent) {
            Map<String, Object> form = buildBookingForm(q, pets);
            if (form != null) {
                Map<String, Object> result = new LinkedHashMap<>();
                result.put("status", "success");
                result.put("role", role);
                result.put("mode", "booking");
                result.put("bookingForm", form);
                result.put("answer", bookingAnswer(form));
                return result;
            }
        }

        Map<String, Object> result = new LinkedHashMap<>(callRag(q, role, pets));
        result.putIfAbsent("status", "success");
        result.put("role", role);
        result.put("mode", "diagnosis");
        return result;
    }

    private String bookingAnswer(Map<String, Object> form) {
        String serviceName = String.valueOf(form.get("serviceName"));
        String petName = String.valueOf(form.get("petName"));
        LocalDate date = LocalDate.parse(String.valueOf(form.get("date")));
        return String.format(
                "Mình đã chuẩn bị phiếu đặt lịch %s cho %s vào %s. "
                + "Bạn kiểm tra và xác nhận thông tin bên dưới nhé. "
                + "Nếu bé đang có dấu hiệu bất thường, hãy mô tả thêm để mình tư vấn trước khi đặt lịch.",
                serviceName, petName, date.format(DATE_FORMATTER)
        );
    }

    private Map<String, Object> callRag(String question, String role, List<Pet> pets) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("question", question);
        body.put("role", role);

        List<Map<String, Object>> petPayload = new ArrayList<>();
        for (Pet pet : pets) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", pet.getId());
            item.put("name", pet.getName());
            item.put("species", pet.getSpecies());
            petPayload.add(item);
        }
        body.put("pets", petPayload);

        try {
            Map<String, Object> response = restClient.post()
                    .uri("/query")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});

            if (response == null) {
                throw new IllegalStateException("RAG service returned an empty body");
            }
            return response;
        } catch (Exception error) {
            log.error("RAG query failed: {}", error.getMessage());
            Map<String, Object> fallback = new LinkedHashMap<>();
            fallback.put("answer", "Xin lỗi, hệ thống tư vấn đang bận. Bạn thử lại sau ít phút, "
                    + "hoặc đưa thú cưng đến bác sĩ thú y nếu tình trạng khẩn cấp.");
            fallback.put("status", "error");
            return fallback;
        }
    }

    private Map<String, Object> buildBookingForm(String question, List<Pet> pets) {
        if (pets.isEmpty()) {
            return null;
        }

        List<CareService> services = careServiceRepository.findAll().stream()
                .filter(CareService::isActive)
                .toList();
        if (services.isEmpty()) {
            return null;
        }

        Pet pet = pets.stream()
                .filter(item -> containsIgnoreCase(question, item.getName()))
                .findFirst()
                .orElse(pets.get(0));

        String hint = serviceHint(question);
        CareService service = services.stream()
                .filter(item -> containsIgnoreCase(item.getName(), hint))
                .findFirst()
                .orElseGet(() -> services.stream()
                        .filter(item -> containsIgnoreCase(item.getName(), "khám"))
                        .findFirst()
                        .orElse(services.get(0)));

        Map<String, Object> form = new LinkedHashMap<>();
        form.put("petId", pet.getId());
        form.put("petName", pet.getName());
        form.put("serviceId", service.getId());
        form.put("serviceName", service.getName());
        form.put("date", parsePreferredDate(question).toString());
        form.put("note", question);
        form.put("branchId", null);
        form.put("estimatedPrice", service.getBasePrice());
        form.put("durationMinutes", service.getDurationMinutes());
        form.put("requiresConfirmation", true);
        return form;
    }

    private boolean isBookingIntent(String question) {
        String text = normalize(question);
        if (BOOKING_KEYWORDS.stream().anyMatch(text::contains)) {
            return true;
        }
        boolean hasBookingVerb = BOOKING_VERBS.stream().anyMatch(text::contains);
        boolean hasBookableService = BOOKABLE_SERVICES.stream().anyMatch(text::contains);
        return hasBookingVerb && hasBookableService;
    }

    private String serviceHint(String question) {
        String text = normalize(question);
        if (text.contains("tiêm")) {
            return "tiêm";
        }
        if (text.contains("tắm") || text.contains("spa") || text.contains("groom")
                || text.contains("cắt tỉa") || text.contains("vệ sinh")) {
            return "tắm";
        }
        if (text.contains("xét nghiệm") || text.contains("xet nghiem")) {
            return "xét nghiệm";
        }
        return "khám";
    }

    private LocalDate parsePreferredDate(String question) {
        String text = normalize(question);
        LocalDate today = LocalDate.now(ZONE);
        if (text.contains("mốt")) {
            return today.plusDays(2);
        }
        if (text.contains("mai")) {
            return today.plusDays(1);
        }
        if (text.contains("hôm nay") || text.contains("nay")
                || text.matches(".*\\b\\d{1,2}\\s*(h|giờ)\\b.*")) {
            return today;
        }
        return today.plusDays(1);
    }

    private String normalize(String text) {
        if (text == null) {
            return "";
        }
        return Normalizer.normalize(text, Normalizer.Form.NFC)
                .toLowerCase(Locale.ROOT)
                .replaceAll("\\s+", " ")
                .trim();
    }

    private boolean containsIgnoreCase(String text, String needle) {
        if (text == null || needle == null || needle.isBlank()) {
            return false;
        }
        return normalize(text).contains(normalize(needle));
    }
}
