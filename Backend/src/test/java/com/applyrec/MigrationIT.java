package com.applyrec;

import com.applyrec.support.EmbeddedPg;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Applies V3 on top of a database that looks like production (V1 + V2 with existing
 * users and applications) and checks that existing data survives and is backfilled.
 */
class MigrationIT {

    @Test
    void v3MigratesExistingDataSafely() throws SQLException {
        String url = EmbeddedPg.newDatabase("migration_it");

        Flyway.configure().dataSource(url, "postgres", "postgres").target("2").load().migrate();

        try (Connection c = DriverManager.getConnection(url, "postgres", "postgres");
             Statement s = c.createStatement()) {
            s.execute("INSERT INTO users (email, password) VALUES ('a@example.com', 'x'), ('b@example.com', 'y')");
            s.execute("""
                    INSERT INTO applications (user_id, company, role, status, applied_date, status_updated_at, salary, notes)
                    VALUES (1, 'Acme',  'SWE', 'Applied',   '2025-01-10', '2025-01-10 08:00', NULL, 'n1'),
                           (1, 'Beta',  'SDE', 'Interview', '2025-01-12', '2025-02-01 09:30', 12.50, NULL),
                           (2, 'Gamma', 'PM',  'Rejected',  '2025-03-01', '2025-02-20 00:00', NULL, NULL)
                    """);
        }

        var result = Flyway.configure().dataSource(url, "postgres", "postgres").load().migrate();
        assertThat(result.targetSchemaVersion).isEqualTo("3");

        try (Connection c = DriverManager.getConnection(url, "postgres", "postgres");
             Statement s = c.createStatement()) {
            // Existing rows keep their data and get safe defaults for the new columns.
            List<String> apps = rows(s, """
                    SELECT company || '|' || status || '|' || COALESCE(salary::text, '-') || '|' ||
                           COALESCE(notes, '-') || '|' || referral || '|' || archived || '|' ||
                           COALESCE(opening_type, '-') || '|' || COALESCE(job_url, '-')
                    FROM applications ORDER BY id
                    """);
            assertThat(apps).containsExactly(
                    "Acme|Applied|-|n1|false|false|-|-",
                    "Beta|Interview|12.50|-|false|false|-|-",
                    "Gamma|Rejected|-|-|false|false|-|-");

            // History backfill: everyone starts as Applied on the applied date; moved ones get one transition.
            List<String> history = rows(s, """
                    SELECT application_id || ':' || COALESCE(from_status, 'null') || '>' || to_status || '@' ||
                           to_char(changed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI')
                    FROM status_history ORDER BY application_id, changed_at, id
                    """);
            assertThat(history).containsExactly(
                    "1:null>Applied@2025-01-10 00:00",
                    "2:null>Applied@2025-01-12 00:00",
                    "2:Applied>Interview@2025-02-01 09:30",
                    "3:null>Applied@2025-03-01 00:00",
                    // status_updated_at was before the applied date, so the later of the two is used
                    "3:Applied>Rejected@2025-03-01 00:00");

            // Constraints: a referral requires an off-campus opening.
            assertThatThrownBy(() -> s.execute("UPDATE applications SET referral = TRUE WHERE id = 1"))
                    .hasMessageContaining("chk_referral_off_campus");
            s.execute("UPDATE applications SET opening_type = 'OFF_CAMPUS', referral = TRUE WHERE id = 1");
            assertThatThrownBy(() -> s.execute("UPDATE applications SET opening_type = 'SOMEWHERE' WHERE id = 2"))
                    .isInstanceOf(SQLException.class);

            // Deleting an application cascades to its tags, interviews and history.
            s.execute("INSERT INTO application_tags VALUES (2, 'remote')");
            s.execute("INSERT INTO interviews (application_id, round, scheduled_at) VALUES (2, 'R1', now())");
            s.execute("DELETE FROM applications WHERE id = 2");
            assertThat(rows(s, "SELECT count(*)::text FROM status_history WHERE application_id = 2")).containsExactly("0");
            assertThat(rows(s, "SELECT count(*)::text FROM application_tags")).containsExactly("0");
            assertThat(rows(s, "SELECT count(*)::text FROM interviews")).containsExactly("0");
        }
    }

    private static List<String> rows(Statement s, String sql) throws SQLException {
        List<String> out = new ArrayList<>();
        try (ResultSet rs = s.executeQuery(sql)) {
            while (rs.next()) out.add(rs.getString(1));
        }
        return out;
    }
}
