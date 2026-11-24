package com.peephole.server.message;

import org.springframework.data.jpa.repository.JpaRepository;

interface MessageRepository extends JpaRepository<Message, Long> {}
