package com.peephole.server.property;

/** What other features may know about a property, in any status. */
public record PropertyOverview(long id, long agencyId, String title, String area, String address, boolean active) {}
