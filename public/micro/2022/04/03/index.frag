precision highp float;

// Defines
#define MAX_FLOAT 3.402823466e+38
#define MIN_FLOAT 1.175494351e-38
#define DEPTH {{DEPTH}}

#define MATERIAL_LAMBERTIAN 0
#define MATERIAL_METAL 1
#define MATERIAL_DIELECTRIC 2

#define NUM_MATERIALS {{NUM_MATERIALS}}

// Structs
// TODO: inline these?
struct camera {
  float vfov;
  float aspect_ratio;

  vec3 origin;
  vec3 horizontal;
  vec3 vertical;
  vec3 lower_left_corner;
  vec3 u;
  vec3 v;
  vec3 w;
  float lens_radius;
};

struct ray {
  vec3 origin;
  vec3 direction;
};

struct material {
  int type;
  vec3 albedo;
  float fuzz;
  float index_of_refraction;
};

struct hit_record {
  vec3 p;
  vec3 normal;
  material material;
  float t;
  bool front_face;
};

struct sphere {
  vec3 center;
  float r;
  material material;
};

// Uniforms
uniform vec2 uResolution;
uniform float uTime;
uniform sampler2D uTexture;
uniform float uSampleRatio;

// Function stubs
float rand(vec2 p);
vec3 rand_in_unit_sphere(vec2 p);
vec3 rand_in_unit_disk(vec2 p);
vec3 rand_unit_vector(vec2 p);
vec3 rand_in_hemisphere(vec2 p, vec3 normal);

bool near_zero(vec3 v);

float reflectance(float cosine, float ref_idx);

camera create_camera(vec3 lookfrom, vec3 lookat, vec3 vup, float vfov, float aspect_ratio, float aperture, float focus_dist);
ray camera_get_ray(camera c, float s, float t);
vec3 ray_at(ray r, float t);
vec3 ray_color(ray r);
bool sphere_hit(sphere s, ray r, float t_min, float t_max, inout hit_record rec);
void hit_record_set_face_normal(inout hit_record rec, ray r, vec3 outward_normal);
bool scatter(material m, ray r, inout hit_record rec, inout vec3 attenuation, inout ray scattered);

bool hit_world(ray r, float t_min, float t_max, inout hit_record rec);

// Functions
vec3 p3 = vec3(0.);
float rand(vec2 p) {
  // hash2 taken from Dave Hoskins
  // https://www.shadertoy.com/view/4djSRW
  p3 = mod(p3,6.28);
  p3 = fract(vec3((p.xyx*p3)+uTime) * .2831);
  p3 += dot(p3, p3.yzx + 19.19);
  return fract((p3.x + p3.y) * p3.z) - 0.5;
  //return fract(sin(dot(p, vec2(12.9898, 78.233))+uTime) * 43758.5453) / 2.0;
}

vec3 rand_in_unit_sphere(vec2 p) {
  return vec3(rand(p), rand(p), rand(p));
}

vec3 rand_in_unit_disk(vec2 p) {
  return vec3(rand(p), rand(p), 0.0);
}

vec3 rand_unit_vector(vec2 p) {
  return normalize(vec3(rand(p), rand(p), rand(p)));
}

vec3 rand_in_hemisphere(vec2 p, vec3 normal) {
  vec3 in_unit_sphere = rand_in_unit_sphere(p);
  if (dot(in_unit_sphere, normal) <= 0.0) {
    in_unit_sphere = -in_unit_sphere;
  }
  return in_unit_sphere;
}

bool near_zero(vec3 v) {
  const float s = 1e-8;
  return (abs(v.x) < s) && (abs(v.y) < s) && (abs(v.z) < s);
}

float reflectance(float cosine, float ref_idx) {
  float r0 = (1.0 - ref_idx) / (1.0 + ref_idx);
  r0 = r0 * r0;
  return r0 + (1.0 - r0)*pow((1.0 - cosine), 5.0);
}

camera create_camera(vec3 lookfrom, vec3 lookat, vec3 vup, float vfov, float aspect_ratio, float aperture, float focus_dist) {
  camera c;
  c.vfov = vfov;
  c.aspect_ratio = aspect_ratio;

  float theta = radians(vfov);
  float h = tan(theta/2.0);
  float viewport_height = 2.0 * h;
  float viewport_width = aspect_ratio * viewport_height;

  c.w = normalize(lookfrom - lookat);
  c.u = normalize(cross(vup, c.w));
  c.v = cross(c.w, c.u);

  c.origin = lookfrom;
  c.horizontal = focus_dist * viewport_width * c.u;
  c.vertical = focus_dist * viewport_height * c.v;
  c.lower_left_corner = c.origin - c.horizontal/2.0 - c.vertical/2.0 - focus_dist * c.w;
  c.lens_radius = aperture / 2.0;

  return c;
}

ray camera_get_ray(camera c, float s, float t) {
  vec3 rd = c.lens_radius * rand_in_unit_disk(vec2(s,t));
  vec3 off = c.u * rd.x + c.v * rd.y;

  return ray(
      c.origin + off,
      c.lower_left_corner + s*c.horizontal + t*c.vertical - c.origin - off
      );
}

vec3 ray_at(ray r, float t) {
  return r.origin + t * r.direction;
}

vec3 ray_color(ray r) {
  vec3 color_buf = vec3(1.0);
  bool broke = false;
  for (int i = 0; i < DEPTH; i++) {
    hit_record rec;
    if (hit_world(r, 0.001, MAX_FLOAT, rec)) {
      ray scattered;
      vec3 attenuation;
      material mat = rec.material;

      if (scatter(mat, r, rec, attenuation, scattered)) {
        r = scattered;
        color_buf = color_buf * attenuation;
      }
    } else {
      broke = true;
      break;
    }
  }

  if (!broke) {
    return vec3(0.0, 0.0, 0.0);
  }

  vec3 unit_direction = normalize(r.direction);
  float t = 0.5 * (unit_direction.y + 1.0);
  vec3 color = (1.0 - t) * vec3(1.0, 1.0, 1.0) + t * vec3(0.5, 0.7, 1.0);
  return color_buf * color;
}

bool sphere_hit(sphere s, ray r, float t_min, float t_max, inout hit_record rec) {
  vec3 oc = r.origin - s.center;
  float a = dot(r.direction, r.direction);
  float half_b = dot(oc, r.direction);
  float c = dot(oc, oc) - s.r*s.r;

  float discriminant = half_b*half_b - a*c;
  if (discriminant < 0.0) {
    return false;
  }

  float sqrtd = sqrt(discriminant);

  float root = (-half_b - sqrtd) / a;
  if (root < t_min || t_max < root) {
    root = (-half_b+sqrtd) / a;
    if (root < t_min || t_max < root) {
      return false;
    }
  }

  rec.t = root;
  rec.p = ray_at(r, rec.t);
  vec3 outward_normal = (rec.p - s.center) / s.r;
  hit_record_set_face_normal(rec, r, outward_normal);
  rec.material = s.material;
  return true;
}

void hit_record_set_face_normal(inout hit_record rec, ray r, vec3 outward_normal) {
  rec.front_face = dot(r.direction, outward_normal) < 0.0;
  rec.normal = rec.front_face ? outward_normal : -outward_normal;
}

bool scatter(material m, ray r, inout hit_record rec, inout vec3 attenuation, inout ray scattered) {
  if (m.type == MATERIAL_LAMBERTIAN) {
    vec3 scatter_direction = rec.normal + rand_unit_vector(rec.p.xy);
    if (near_zero(scatter_direction)) {
      scatter_direction = rec.normal;
    }
    scattered = ray(rec.p, scatter_direction);
    attenuation = m.albedo;
    return true;
  }

  if (m.type == MATERIAL_METAL) {
    vec3 reflected = reflect(normalize(r.direction), rec.normal);
    scattered = ray(rec.p, reflected + (m.fuzz*rand_in_unit_sphere(rec.p.xy)));
    attenuation = m.albedo;
    return (dot(scattered.direction, rec.normal) > 0.0);
  }

  if (m.type == MATERIAL_DIELECTRIC) {
    attenuation = vec3(1.0);
    float refraction_ratio = rec.front_face ? (1.0/m.index_of_refraction) : m.index_of_refraction;
    vec3 unit_direction = normalize(r.direction);

    float cos_theta = min(dot(-unit_direction, rec.normal), 1.0);
    float sin_theta = sqrt(1.0 - cos_theta*cos_theta);

    bool cannot_refract = refraction_ratio * sin_theta > 1.0;
    vec3 direction;

    if (cannot_refract ||
        reflectance(cos_theta, refraction_ratio) > rand(rec.p.xy)) {
      direction = reflect(unit_direction, rec.normal);
    } else {
      direction = refract(unit_direction, rec.normal, refraction_ratio);
    }

    scattered = ray(rec.p, direction);
    return true;
  }

  return false;
}

// World
{{hit_world_definitions}}
bool hit_world(ray r, float t_min, float t_max, inout hit_record rec) {
  hit_record temp_rec;
  bool hit_anything = false;
  float closest_so_far = t_max;

  {{hit_world_body}}

  return hit_anything;
}

// Entrypoint
void main(void) {
  vec2 off = vec2(rand(gl_FragCoord.xy), rand(gl_FragCoord.xy));
  vec2 uv = (gl_FragCoord.xy+off)/uResolution;
  float u = uv.x;
  float v = uv.y;

  vec3 lookfrom = vec3(13.0, 2.0, 3.0);
  vec3 lookat = vec3(0.0, 0.0, 0.0);
  vec3 vup = vec3(0.0, 1.0, 0.0);
  float vfov = 30.0;
  float aspect_ratio = 1.0;
  float dist_to_focus = 10.0;
  float aperture = 0.1;
  camera c = create_camera(lookfrom, lookat, vup, vfov, aspect_ratio, aperture, dist_to_focus);

  ray r = camera_get_ray(c, u, v);
  vec4 col = vec4(ray_color(r), 1.0);
  gl_FragColor = mix(clamp(sqrt(col), 0.0, 1.0), texture2D(uTexture, uv), uSampleRatio);
}

