CREATE TABLE agency (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       VARCHAR(255)             NOT NULL,
  email      VARCHAR(255)             NOT NULL,
  phone      VARCHAR(20)              NOT NULL,
  verified   BOOLEAN                  NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
