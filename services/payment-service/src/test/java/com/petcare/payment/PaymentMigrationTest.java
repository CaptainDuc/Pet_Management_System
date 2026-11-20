package com.petcare.payment;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Map;
import java.util.TimeZone;
import java.util.UUID;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PaymentMigrationTest {
    private static final PostgreSQLContainer<?> PG;
    private static final Path ROOT = Path.of("..", "..").toAbsolutePath().normalize();
    static {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        PG = new PostgreSQLContainer<>("postgres:16-alpine");
        PG.start();
    }
    @AfterAll static void stopDatabase() { PG.stop(); }

    private String schema() { return "payment_" + UUID.randomUUID().toString().replace("-", ""); }
    private Flyway canonical(String schema) {
        return Flyway.configure().dataSource(PG.getJdbcUrl(), PG.getUsername(), PG.getPassword())
                .schemas(schema).defaultSchema(schema).locations("classpath:db/migration").load();
    }
    private void execute(String schema, String sql) throws SQLException {
        try (Connection connection = DriverManager.getConnection(PG.getJdbcUrl(), PG.getUsername(), PG.getPassword());
             var statement = connection.createStatement()) {
            statement.execute("SET search_path TO " + schema);
            statement.execute(sql);
        }
    }
    private String query(String schema, String sql) throws SQLException {
        try (Connection connection = DriverManager.getConnection(PG.getJdbcUrl(), PG.getUsername(), PG.getPassword());
             var statement = connection.createStatement()) {
            statement.execute("SET search_path TO " + schema);
            try (var result = statement.executeQuery(sql)) { result.next(); return result.getString(1); }
        }
    }
    private void legacy(String schema) throws Exception {
        Flyway.configure().dataSource(PG.getJdbcUrl(), PG.getUsername(), PG.getPassword())
                .schemas(schema).defaultSchema(schema)
                .locations("filesystem:" + ROOT.resolve("infrastructure/postgres/payment-history")).load().migrate();
        // Reproduce this project's known applied V1+V4 history without running V1 twice.
        execute(schema, "DELETE FROM flyway_schema_history WHERE version IS NULL AND type='SCHEMA'; "
                + "UPDATE flyway_schema_history SET installed_rank=2 WHERE version='4'; "
                + "INSERT INTO flyway_schema_history (installed_rank,version,description,type,script,checksum,installed_by,execution_time,success) "
                + "VALUES (1,'1','init payment schema','SQL','V1__init_payment_schema.sql',83097785,current_user,0,true); "
                + "INSERT INTO orders (order_code,total_amount) VALUES ('KEEP-ORDER',123456); "
                + "INSERT INTO payment_transactions (order_id,amount,sepay_transaction_id) SELECT id,123456,999 FROM orders;");
    }
    private void adopt(String schema) throws Exception {
        execute(schema, Files.readString(ROOT.resolve("infrastructure/postgres/normalize_payment_history.sql")));
    }

    @Test void freshDatabaseMigratesAndChecksumsStayCanonical() {
        Flyway flyway = canonical(schema());
        flyway.migrate();
        flyway.validate();
        var migrations = Arrays.stream(flyway.info().applied()).filter(item -> item.getVersion() != null).toList();
        assertThat(migrations).hasSize(4);
        Map<String, Integer> expected = Map.of("1",83097785,"2",-1182131905,"3",1911053231);
        for (var migration : migrations) {
            String version = migration.getVersion().toString();
            if (expected.containsKey(version)) assertThat(migration.getChecksum()).isEqualTo(expected.get(version));
        }
    }

    @Test void databaseAtV1UpgradesWithoutLosingPayment() throws Exception {
        String schema = schema();
        Flyway.configure().configuration(canonical(schema).getConfiguration()).target("1").load().migrate();
        execute(schema, "INSERT INTO payments (invoice_id,owner_id,invoice_code,expected_amount,method) "
                + "VALUES (gen_random_uuid(),gen_random_uuid(),'KEEP-INVOICE',123456,'CASH');");
        String before = query(schema, "SELECT row_to_json(p)::text FROM payments p");
        canonical(schema).migrate();
        canonical(schema).validate();
        assertThat(query(schema, "SELECT row_to_json(p)::text FROM payments p")).isEqualTo(before);
    }

    @Test void otherBranchV1ToV3UpgradesWithoutLosingOrder() throws Exception {
        String schema = schema();
        Flyway.configure().configuration(canonical(schema).getConfiguration()).target("3").load().migrate();
        execute(schema, "INSERT INTO orders (order_code,total_amount) VALUES ('KEEP-ORDER',123456)");
        String before = query(schema, "SELECT row_to_json(o)::text FROM orders o");
        canonical(schema).migrate();
        canonical(schema).validate();
        assertThat(query(schema, "SELECT row_to_json(o)::text FROM orders o")).isEqualTo(before);
    }

    @Test void knownLegacyBaselineAdoptsAndCanRepeatWithoutChangingBusinessRows() throws Exception {
        String schema = schema();
        legacy(schema);
        assertThatThrownBy(() -> canonical(schema).validate()).isInstanceOf(FlywayException.class);
        String order = query(schema, "SELECT row_to_json(o)::text FROM orders o");
        String transaction = query(schema, "SELECT row_to_json(t)::text FROM payment_transactions t");
        adopt(schema);
        canonical(schema).migrate();
        canonical(schema).validate();
        adopt(schema);
        assertThat(query(schema, "SELECT row_to_json(o)::text FROM orders o")).isEqualTo(order);
        assertThat(query(schema, "SELECT row_to_json(t)::text FROM payment_transactions t")).isEqualTo(transaction);
        assertThat(Arrays.stream(canonical(schema).info().applied()).filter(item -> item.getVersion() != null)).hasSize(4);
    }

    @Test void legacyV1ColumnSettingsAreRestoredForSepayWithoutChangingExistingRows() throws Exception {
        String schema = schema();
        legacy(schema);
        execute(schema, "DELETE FROM payment_transactions; "
                + "ALTER TABLE payment_transactions ALTER COLUMN payment_id SET NOT NULL; "
                + "ALTER TABLE payment_transactions ALTER COLUMN transaction_type DROP DEFAULT; "
                + "ALTER TABLE payment_transactions ALTER COLUMN provider DROP DEFAULT; "
                + "ALTER TABLE payment_transactions ALTER COLUMN idempotency_key DROP DEFAULT; "
                + "INSERT INTO payments (invoice_id,owner_id,invoice_code,expected_amount,method) "
                + "VALUES (gen_random_uuid(),gen_random_uuid(),'KEEP-INVOICE',123456,'CASH'); "
                + "INSERT INTO payment_transactions (payment_id,transaction_type,provider,idempotency_key,amount) "
                + "SELECT id,'PAYMENT','CASH','keep-key',123456 FROM payments;");
        String payment = query(schema, "SELECT row_to_json(p)::text FROM payments p");
        String transaction = query(schema, "SELECT row_to_json(t)::text FROM payment_transactions t");
        adopt(schema);
        canonical(schema).migrate();
        canonical(schema).validate();
        assertThat(query(schema, "SELECT row_to_json(p)::text FROM payments p")).isEqualTo(payment);
        assertThat(query(schema, "SELECT row_to_json(t)::text FROM payment_transactions t")).isEqualTo(transaction);
        execute(schema, "INSERT INTO payment_transactions (order_id,amount,sepay_transaction_id) "
                + "SELECT id,123456,1000 FROM orders;");
        assertThat(query(schema, "SELECT provider FROM payment_transactions WHERE sepay_transaction_id=1000")).isEqualTo("SEPAY");
    }

    @Test void unknownLegacyChecksumIsRejectedWithoutChangingHistory() throws Exception {
        String schema = schema();
        legacy(schema);
        execute(schema, "UPDATE flyway_schema_history SET checksum=123 WHERE version='4'");
        assertThatThrownBy(() -> adopt(schema)).isInstanceOf(SQLException.class).hasMessageContaining("Unsupported");
        assertThat(query(schema, "SELECT checksum FROM flyway_schema_history WHERE version='4'")).isEqualTo("123");
        assertThat(query(schema, "SELECT count(*) FROM orders")).isEqualTo("1");
    }

    @Test void incompleteLegacySchemaIsRejectedWithoutChangingHistory() throws Exception {
        String schema = schema();
        legacy(schema);
        execute(schema, "DROP TABLE payment_events");
        assertThatThrownBy(() -> adopt(schema)).isInstanceOf(SQLException.class).hasMessageContaining("Missing expected");
        assertThat(query(schema, "SELECT checksum FROM flyway_schema_history WHERE version='4'")).isEqualTo("995927507");
        assertThat(query(schema, "SELECT count(*) FROM orders")).isEqualTo("1");
    }
}
