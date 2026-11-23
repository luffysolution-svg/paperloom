# Buildx returns a single image config or an object keyed by platform.
. as $images | ($platforms | split(",")) as $targets |
all($targets[];
  . as $platform |
  (if ($targets | length) == 1 and ($images | has("config"))
   then $images else $images[$platform] end) |
  .config.Labels["org.opencontainers.image.revision"] == $revision and
  .config.Labels["org.opencontainers.image.version"] == $version
)
