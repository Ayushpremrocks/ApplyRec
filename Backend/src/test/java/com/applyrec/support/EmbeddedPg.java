package com.applyrec.support;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;

import javax.sql.DataSource;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * One real PostgreSQL server (same version as production) per test JVM, with a fresh
 * database per caller. Runs entirely locally; never connects to a remote database.
 */
public final class EmbeddedPg {

    private static EmbeddedPostgres server;

    private EmbeddedPg() {
    }

    private static synchronized EmbeddedPostgres server() {
        if (server == null) {
            try {
                server = EmbeddedPostgres.builder().start();
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                try {
                    server.close();
                } catch (IOException ignored) {
                    // JVM is exiting
                }
            }));
        }
        return server;
    }

    /** Creates an empty database and returns its JDBC URL (user/password: postgres/postgres). */
    public static synchronized String newDatabase(String name) {
        EmbeddedPostgres pg = server();
        DataSource admin = pg.getPostgresDatabase();
        try (Connection c = admin.getConnection(); Statement s = c.createStatement()) {
            s.execute("DROP DATABASE IF EXISTS " + name);
            s.execute("CREATE DATABASE " + name);
        } catch (SQLException e) {
            throw new IllegalStateException(e);
        }
        return pg.getJdbcUrl("postgres", name);
    }
}
