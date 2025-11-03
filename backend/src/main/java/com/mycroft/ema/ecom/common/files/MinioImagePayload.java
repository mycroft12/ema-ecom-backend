package com.mycroft.ema.ecom.common.files;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mycroft.ema.ecom.common.metadata.ColumnSemantics;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Structured representation of a MINIO image field, carrying uploaded items and the constraint metadata that governs them.
 */
public final class MinioImagePayload {
  public static final String TYPE = "MINIO_IMAGE";
  private final List<Item> items;
  private final int maxImages;
  private final long maxFileSizeBytes;
  private final List<String> allowedMimeTypes;
  private final Map<String, Object> extras;

  private MinioImagePayload(List<Item> items,
                            int maxImages,
                            long maxFileSizeBytes,
                            List<String> allowedMimeTypes,
                            Map<String, Object> extras) {
    this.items = Collections.unmodifiableList(items);
    this.maxImages = maxImages;
    this.maxFileSizeBytes = maxFileSizeBytes;
    this.allowedMimeTypes = allowedMimeTypes == null ? List.of() : List.copyOf(allowedMimeTypes);
    this.extras = extras == null ? Map.of() : Map.copyOf(extras);
  }

  public List<Item> items() {
    return items;
  }

  public int maxImages() {
    return maxImages;
  }

  public long maxFileSizeBytes() {
    return maxFileSizeBytes;
  }

  public List<String> allowedMimeTypes() {
    return allowedMimeTypes;
  }

  public Map<String, Object> extras() {
    return extras;
  }

  public boolean isEmpty() {
    return items.isEmpty();
  }

  public boolean exceedsMaxImages() {
    return items.size() > maxImages;
  }

  public boolean needsRefresh(Duration threshold, Duration skew, Instant now) {
    if (items.isEmpty()) {
      return false;
    }
    Duration effectiveThreshold = threshold == null ? Duration.ZERO : threshold;
    Duration effectiveSkew = skew == null ? Duration.ZERO : skew;
    Instant pivot = now.plus(effectiveThreshold).plus(effectiveSkew);
    return items.stream()
        .map(Item::expiresAt)
        .filter(Objects::nonNull)
        .anyMatch(exp -> exp.isBefore(pivot));
  }

  public MinioImagePayload withRefreshedItem(int index, MinioFileStorageService.UploadResponse response) {
    if (index < 0 || index >= items.size()) {
      return this;
    }
    List<Item> mutated = new ArrayList<>(items);
    Item current = mutated.get(index);
    mutated.set(index, new Item(
        response.key(),
        response.url(),
        response.expiresAt(),
        response.contentType() != null ? response.contentType() : current.contentType(),
        response.sizeBytes() != null ? response.sizeBytes() : current.sizeBytes()
    ));
    return new MinioImagePayload(mutated, maxImages, maxFileSizeBytes, allowedMimeTypes, extras);
  }

  public MinioImagePayload withItem(Item item, boolean replaceAll) {
    List<Item> mutated = new ArrayList<>();
    if (!replaceAll) {
      mutated.addAll(items);
    }
    mutated.add(item);
    return new MinioImagePayload(mutated, maxImages, maxFileSizeBytes, allowedMimeTypes, extras);
  }

  public String toJson(ObjectMapper mapper) {
    try {
      return mapper.writeValueAsString(toStructuredMap());
    } catch (Exception ex) {
      throw new IllegalStateException("Failed to serialize MinIO payload", ex);
    }
  }

  public Map<String, Object> toStructuredMap() {
    return Map.of(
        "type", TYPE,
        "items", items.stream().map(Item::toMap).toList(),
        "maxImages", maxImages,
        "constraints", Map.of(
            "maxFileSizeBytes", maxFileSizeBytes,
            "allowedMimeTypes", allowedMimeTypes
        )
    );
  }

  public static MinioImagePayload empty(ColumnSemantics semantics,
                                        MinioProperties props) {
    int maxImages = semantics != null ? semantics.maxImages(props.getDefaultMaxImages()) : props.getDefaultMaxImages();
    long maxFileSize = semantics != null ? semantics.maxFileSizeBytes(props.getMaxImageSizeBytes()) : props.getMaxImageSizeBytes();
    List<String> allowed = semantics != null ? semantics.allowedMimeTypes(props.getAllowedImageMimeTypes()) : props.getAllowedImageMimeTypes();
    return new MinioImagePayload(List.of(), maxImages, maxFileSize, allowed, semantics != null ? semantics.metadata() : Map.of());
  }

  @SuppressWarnings("unchecked")
  public static MinioImagePayload fromRaw(Object value,
                                          ColumnSemantics semantics,
                                          MinioProperties props,
                                          ObjectMapper mapper) {
    if (value == null) {
      return empty(semantics, props);
    }
    if (value instanceof MinioImagePayload payload) {
      return payload;
    }
    try {
      JsonNode node;
      if (value instanceof String str) {
        String trimmed = str.trim();
        if (trimmed.isEmpty()) {
          return empty(semantics, props);
        }
        node = mapper.readTree(trimmed);
      } else if (value instanceof Map<?,?> map) {
        node = mapper.valueToTree(map);
      } else if (value instanceof List<?> list) {
        node = mapper.valueToTree(Map.of("items", list));
      } else {
        node = mapper.valueToTree(value);
      }
      if (node == null || node.isNull()) {
        return empty(semantics, props);
      }
      String type = node.path("type").asText("");
      boolean hasLegacyStructure = node.has("key") && node.has("url");
      List<Item> items = new ArrayList<>();
      if (hasLegacyStructure) {
        items.add(Item.fromLegacy(node));
      } else {
        JsonNode itemsNode = node.path("items");
        if (itemsNode.isMissingNode() || !itemsNode.isArray()) {
          JsonNode maybeSingle = node.path("item");
          if (!maybeSingle.isMissingNode()) {
            items.add(Item.fromNode(maybeSingle));
          }
        } else {
          for (JsonNode itemNode : itemsNode) {
            items.add(Item.fromNode(itemNode));
          }
        }
      }
      items.removeIf(Item::isEmpty);

      int maxImages = semantics != null ? semantics.maxImages(props.getDefaultMaxImages()) : props.getDefaultMaxImages();
      long maxFileSize = semantics != null ? semantics.maxFileSizeBytes(props.getMaxImageSizeBytes()) : props.getMaxImageSizeBytes();
      List<String> allowed = semantics != null ? semantics.allowedMimeTypes(props.getAllowedImageMimeTypes()) : props.getAllowedImageMimeTypes();
      if (!TYPE.equalsIgnoreCase(type)) {
        // allow legacy markers like MINIO_IMAGE or MINIO:IMAGE
        if (!type.replace(":", "_").equalsIgnoreCase(TYPE)) {
          // fallback to empty to avoid leaking content that isn't minio payload
          return empty(semantics, props);
        }
      }
      return new MinioImagePayload(items, maxImages, maxFileSize, allowed,
          semantics != null ? semantics.metadata() : Map.of());
    } catch (Exception ex) {
      return empty(semantics, props);
    }
  }

  public static MinioImagePayload fromUpload(MinioFileStorageService.UploadResponse response,
                                             ColumnSemantics semantics,
                                             MinioProperties props) {
    int maxImages = semantics != null ? semantics.maxImages(props.getDefaultMaxImages()) : props.getDefaultMaxImages();
    long maxFileSize = semantics != null ? semantics.maxFileSizeBytes(props.getMaxImageSizeBytes()) : props.getMaxImageSizeBytes();
    List<String> allowed = semantics != null ? semantics.allowedMimeTypes(props.getAllowedImageMimeTypes()) : props.getAllowedImageMimeTypes();
    Item item = new Item(
        response.key(),
        response.url(),
        response.expiresAt(),
        response.contentType(),
        response.sizeBytes()
    );
    return new MinioImagePayload(List.of(item), maxImages, maxFileSize, allowed,
        semantics != null ? semantics.metadata() : Map.of());
  }

  public Map<String, Object> toClientPayload() {
    return Map.of(
        "type", TYPE,
        "items", items.stream().map(Item::toMap).toList(),
        "maxImages", maxImages,
        "constraints", Map.of(
            "maxFileSizeBytes", maxFileSizeBytes,
            "allowedMimeTypes", allowedMimeTypes
        ),
        "count", items.size()
    );
  }

  public MinioImagePayload capped() {
    if (items.size() <= maxImages) {
      return this;
    }
    List<Item> truncated = new ArrayList<>(items.subList(0, maxImages));
    return new MinioImagePayload(truncated, maxImages, maxFileSizeBytes, allowedMimeTypes, extras);
  }

  /**
   * Individual object entry within a MINIO image payload, storing URL metadata and lifecycle data.
   */
  public record Item(String key, String url, Instant expiresAt, String contentType, Long sizeBytes) {
    public boolean isEmpty() {
      return !StringUtils.hasText(key) && !StringUtils.hasText(url);
    }

    private static Item fromNode(JsonNode node) {
      if (node == null || node.isNull()) {
        return new Item(null, null, null, null, null);
      }
      String key = text(node, "key");
      String url = text(node, "url");
      Instant expiresAt = parseInstant(node.path("expiresAt").asText(null));
      String contentType = text(node, "contentType");
      Long size = node.hasNonNull("sizeBytes") ? node.path("sizeBytes").asLong() : null;
      if (size == null && node.hasNonNull("size")) {
        size = node.path("size").asLong();
      }
      return new Item(key, url, expiresAt, contentType, size);
    }

    private static Item fromLegacy(JsonNode node) {
      String key = text(node, "key");
      String url = text(node, "url");
      Instant expiresAt = parseInstant(node.path("expiresAt").asText(null));
      return new Item(key, url, expiresAt, text(node, "contentType"), node.hasNonNull("sizeBytes") ? node.path("sizeBytes").asLong() : null);
    }

    private static String text(JsonNode node, String field) {
      if (node == null || node.isNull()) {
        return null;
      }
      JsonNode child = node.path(field);
      if (child.isMissingNode() || child.isNull()) {
        return null;
      }
      String value = child.asText();
      return value == null ? null : value.trim();
    }

    private static Instant parseInstant(String value) {
      if (!StringUtils.hasText(value)) {
        return null;
      }
      try {
        return Instant.parse(value);
      } catch (Exception ignored) {
        return null;
      }
    }

    private Map<String, Object> toMap() {
      return Map.of(
          "key", key,
          "url", url,
          "expiresAt", expiresAt != null ? expiresAt.toString() : null,
          "contentType", contentType,
          "sizeBytes", sizeBytes
      );
    }
  }

  public MinioImagePayload ensureConstraints() {
    List<Item> constrained = new ArrayList<>(items);
    if (constrained.size() > maxImages) {
      constrained = constrained.subList(0, maxImages);
    }
    return new MinioImagePayload(constrained, maxImages, maxFileSizeBytes, allowedMimeTypes, extras);
  }

  public Optional<Item> firstItem() {
    if (items.isEmpty()) {
      return Optional.empty();
    }
    return Optional.ofNullable(items.get(0));
  }

  public MinioImagePayload withItems(List<Item> newItems) {
    List<Item> sanitized = new ArrayList<>(newItems);
    sanitized.removeIf(Item::isEmpty);
    if (sanitized.size() > maxImages) {
      sanitized = sanitized.subList(0, maxImages);
    }
    return new MinioImagePayload(sanitized, maxImages, maxFileSizeBytes, allowedMimeTypes, extras);
  }

  public boolean isMimeAllowed(String mime) {
    if (!StringUtils.hasText(mime)) {
      return false;
    }
    if (allowedMimeTypes.isEmpty()) {
      return true;
    }
    String normalized = mime.trim().toLowerCase(Locale.ROOT);
    return allowedMimeTypes.stream()
        .filter(StringUtils::hasText)
        .map(m -> m.trim().toLowerCase(Locale.ROOT))
        .anyMatch(allowed -> allowed.equals(normalized) || (allowed.endsWith("/*") && normalized.startsWith(allowed.substring(0, allowed.indexOf('/')))));
  }
}
