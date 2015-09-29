CREATE KEYSPACE api USING REPLICATION = {
    'class' : 'SimpleStrategy',
    'replication_factor' : 1
};

USE api;

CREATE TABLE people (
    id INT PRIMARY KEY,
    name TEXT,
    city TEXT,
    email TEXT
);