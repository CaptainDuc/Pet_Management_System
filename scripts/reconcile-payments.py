"""Read-only transfer reconciliation. Run from the project root with Docker running."""
import json
import subprocess
from decimal import Decimal


def rows(service, sql):
    command = ["docker", "compose", "exec", "-T", service, "sh", "-c",
               'exec psql -XAtq -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"']
    output = subprocess.check_output(command, input=f"SELECT row_to_json(r) FROM ({sql}) r;",
                                     text=True, encoding="utf-8")
    return [json.loads(line, parse_float=Decimal) for line in output.splitlines()]


def main():
    bookings = {row["id"]: row for row in rows("backend-postgres",
                "SELECT id,status,payment_status,payment_order_code,payment_method,total_amount FROM bookings")}
    invoices = {row["id"]: row["booking_id"] for row in rows("backend-postgres",
                "SELECT id,booking_id FROM invoices")}
    transfers = rows("payment-postgres", """
        SELECT o.order_code,o.booking_id,o.invoice_id,o.total_amount,o.status,
               string_agg(t.sepay_transaction_id::text, ',') AS transfers,
               sum(t.amount_in) AS received
        FROM payment_transactions t LEFT JOIN orders o ON o.id=t.order_id
        WHERE t.sepay_transaction_id IS NOT NULL AND t.amount_in IS NOT NULL
        GROUP BY o.id, CASE WHEN o.id IS NULL THEN t.id END""")
    for booking in bookings.values():
        if (booking["status"] == "CANCELLED" and booking["payment_status"] == "PAID"
                and booking["payment_method"] == "CASH"):
            print("REVIEW_CASH_REFUND", booking["id"], "-", booking["total_amount"], sep="\t")
    for row in transfers:
        booking = bookings.get(row["booking_id"] or invoices.get(row["invoice_id"]))
        received = row["received"]
        if not booking:
            reason, amount = "UNMATCHED", received
        elif booking["status"] == "CANCELLED" or (booking["payment_status"] == "PAID"
                and booking["payment_order_code"] != row["order_code"]):
            reason, amount = "REVIEW_REFUND", received
        elif received > row["total_amount"]:
            reason, amount = "OVERPAID", received - row["total_amount"]
        elif received < row["total_amount"]:
            reason, amount = "OUTSTANDING", row["total_amount"] - received
        elif booking["payment_status"] != "PAID":
            reason, amount = "CHECK_SYNC", received
        else:
            continue
        print(reason, row["order_code"] or "-", row["transfers"], amount, sep="\t")


if __name__ == "__main__":
    main()
