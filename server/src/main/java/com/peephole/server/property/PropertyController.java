package com.peephole.server.property;

import com.peephole.server.common.ProblemResponse;
import com.peephole.server.property.dto.PropertyDetailsResponse;
import com.peephole.server.property.dto.PropertySummaryResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/properties")
@Tag(name = "Properties", description = "Browse the property catalog")
class PropertyController {

    private final PropertyService service;

    PropertyController(PropertyService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(
            summary = "List active properties",
            description = "Returns all active properties, optionally filtered by operation.")
    @ApiResponse(responseCode = "200", description = "The list of properties")
    @ApiResponse(
            responseCode = "400",
            description = "VALIDATION_FAILED: the operation value is not RENT or SALE",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    List<PropertySummaryResponse> list(@RequestParam(required = false) String operation) {
        PropertyOperation parsedOperation = parseOperation(operation);
        return service.findAll(parsedOperation);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get property details", description = "Returns the details of an active property.")
    @ApiResponse(responseCode = "200", description = "The property details")
    @ApiResponse(
            responseCode = "404",
            description = "NOT_FOUND: the property does not exist or is not active",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    PropertyDetailsResponse details(@PathVariable long id) {
        return service.findById(id);
    }

    private PropertyOperation parseOperation(String operation) {
        if (operation == null) {
            return null;
        }
        try {
            return PropertyOperation.valueOf(operation);
        } catch (IllegalArgumentException e) {
            throw new InvalidOperationException(operation);
        }
    }
}
