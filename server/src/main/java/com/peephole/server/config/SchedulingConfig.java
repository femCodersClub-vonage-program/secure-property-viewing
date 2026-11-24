package com.peephole.server.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

// Runs the @Scheduled tasks, such as the post-visit call check every minute
@Configuration
@EnableScheduling
class SchedulingConfig {}
