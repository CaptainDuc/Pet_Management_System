package com.petcare.platform.common.repository;

import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;

/**
 * Helpers for building {@link Specification}s.
 *
 * <p>Every filter is added only when its value is present. Building predicates
 * unconditionally with {@code (:param IS NULL OR column = :param)} looks convenient
 * but breaks on PostgreSQL: an unbound null has no inferable type and the query
 * fails with "could not determine data type of parameter".
 */
public final class SpecificationUtils {

    private SpecificationUtils() {
    }

    /**
     * Combines non-null specifications with AND.
     *
     * @param specifications specifications to combine; {@code null} entries are ignored
     */
    @SafeVarargs
    public static <T> Specification<T> allOf(Specification<T>... specifications) {
        List<Specification<T>> present = new ArrayList<>();
        for (Specification<T> specification : specifications) {
            if (specification != null) {
                present.add(specification);
            }
        }
        return (root, query, builder) -> {
            if (present.isEmpty()) {
                return builder.conjunction();
            }
            Predicate result = present.getFirst().toPredicate(root, query, builder);
            for (int i = 1; i < present.size(); i++) {
                Predicate next = present.get(i).toPredicate(root, query, builder);
                if (next != null) {
                    result = builder.and(result, next);
                }
            }
            return result;
        };
    }

    /** Equality filter that is skipped when {@code value} is null or blank. */
    public static <T> Specification<T> equalsIgnoreCase(String attribute, String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalised = value.trim();
        return (root, query, builder) -> builder.equal(
                builder.lower(root.get(attribute)), normalised.toLowerCase(Locale.ROOT));
    }

    /** Equality filter that is skipped when {@code value} is null. */
    public static <T> Specification<T> equals(String attribute, Object value) {
        if (value == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get(attribute), value);
    }

    /** Greater-than-or-equal filter on a timestamp attribute. */
    public static <T> Specification<T> atLeast(String attribute, java.time.Instant value) {
        if (value == null) {
            return null;
        }
        return (root, query, builder) -> builder.greaterThanOrEqualTo(root.get(attribute), value);
    }

    /** Less-than-or-equal filter on a timestamp attribute. */
    public static <T> Specification<T> atMost(String attribute, java.time.Instant value) {
        if (value == null) {
            return null;
        }
        return (root, query, builder) -> builder.lessThanOrEqualTo(root.get(attribute), value);
    }

    /** Case-insensitive {@code LIKE} over the given attributes. */
    public static <T> Specification<T> containsAny(Collection<String> attributes, String value) {
        if (value == null || value.isBlank() || attributes == null || attributes.isEmpty()) {
            return null;
        }
        String pattern = "%" + value.trim().toLowerCase(Locale.ROOT) + "%";
        return (root, query, builder) -> {
            Predicate[] likes = attributes.stream()
                    .map(attribute -> builder.like(builder.lower(root.get(attribute)), pattern))
                    .toArray(Predicate[]::new);
            return builder.or(likes);
        };
    }
}