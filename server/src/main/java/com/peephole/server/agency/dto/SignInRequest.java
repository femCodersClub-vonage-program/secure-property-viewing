package com.peephole.server.agency.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SignInRequest(
        @NotBlank @Email String email, @NotBlank String password) {

    @Override
    public String toString() {
        return "SignInRequest[email=<hidden>, password=<hidden>]";
    }
}
