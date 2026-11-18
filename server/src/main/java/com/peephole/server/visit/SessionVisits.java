package com.peephole.server.visit;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.HashSet;
import java.util.Set;

/**
 * The visits booked from this browser, kept in its HTTP session right after booking, as specs/visit-booking.md says.
 * The video visit uses them to create room links only from the browser that booked.
 */
public final class SessionVisits {

    static final String ATTRIBUTE = "bookedVisitIds";

    private SessionVisits() {}

    public static void add(HttpSession session, long visitId) {
        Set<Object> visitIds = new HashSet<>(of(session));
        visitIds.add(visitId);
        session.setAttribute(ATTRIBUTE, visitIds);
    }

    // Reads the session without creating one, so a request from a browser that never booked gets no session
    public static boolean contains(HttpServletRequest request, long visitId) {
        HttpSession session = request.getSession(false);
        return session != null && of(session).contains(visitId);
    }

    private static Set<?> of(HttpSession session) {
        return session.getAttribute(ATTRIBUTE) instanceof Set<?> visitIds ? visitIds : Set.of();
    }
}
