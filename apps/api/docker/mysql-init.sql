-- Runs once, when the MySQL volume is first created. `pethouse` comes from MYSQL_DATABASE;
-- the e2e suite needs its own database.
CREATE DATABASE IF NOT EXISTS pethouse_test;
