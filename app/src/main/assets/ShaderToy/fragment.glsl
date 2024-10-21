// https://www.shadertoy.com/view/ftKBzh Exceptional G2 and Rolling Balls by jt

// tags: simple, balls, group, split, rolling, octonions, finite, g2, groups, exceptional

// MIT License, as in https://www.shadertoy.com/terms

/*

Copyright (c) 2022 Jakob Thomsen

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

// tags: exceptional, group, g2, rolling, balls, split, octonions

// The exceptional group G2 is related to a ball rolling on a three times bigger one without slipping,
// according to "JOHN BAEZ | SPLIT OCTONIONS and the ROLLING BALL" by CIMAT,
// https://www.youtube.com/watch?v=xvflQcHT5C4
// This visualization shows (as explained in the talk):
// For the ratio 3 / 1 of radii spinorial and projective rotation coincide.

// Quote from the presentation (17:00):
// "G2 is the symmetry group of a nonassociative algebra called the 'octonions'.
//  But it also appears as the symmetries of a ball rolling on another ball!"

// Quote [with my annotations] from the presentation (17:30):
// "We need to get three things right:
//  * The rolling ball must be 'spinorial': we need to turn it around twice
//    for it to come back to its same orientation. [here visualized by color]
//  * The fixed ball should be 'projective': the rolling ball only needs to roll
//    halfway around it to come back to the same position. [here done by two balls]
//  * The fixed ball must have radius 3 times that of the small ball,
//    or vice versa. [because then 'spinorial' and 'projective' rotations coincide]"

// Lightweight sphere visualization see:
// https://www.shadertoy.com/view/slyfz1 spherelet by jt

#define pi 3.1415926

vec3 checker(vec3 c0, vec3 c1, vec2 p)
{
    //p = fract(p) - 0.5;
    p = sin(2.0 * pi * p);
    //vec2 edges = (1.0 - exp2(-p*p*1000.0)); // edges used to hide aliasing
    vec2 edges = (1.0 - exp2(-p*p*iResolution.xy/4.0)); // edges used to hide aliasing
    return mix(c0, c1, step(0.0, p.x * p.y)) * edges.x * edges.y;
}

// returns normal of either sphere (n, 1) or background plane (n, 0)
vec4 sphere_normal(vec2 p)
{
    float t = 1.0 - p.x * p.x - p.y * p.y;
    //float choose = t < 0.0 ? 0.0 : 1.0;
    float choose = smoothstep(0.0, 0.02, t);
    vec3 normal_plane = vec3(0,0,1);
    if(t < 0.0) // avoid NaN later on
        return vec4(normal_plane, 0.0); // background plane
    vec3 normal_sphere = normalize(vec3(p.x, p.y, sqrt(t)));
    //return vec4(normal_sphere, 1.0); // sphere
    return vec4(mix(normal_plane, normal_sphere, step(0.0, t)), choose); // antialiased version
}

vec4 sphere_lighted_big(vec2 p, vec3 c0, vec3 c1, vec2 t, vec3 l) // (could be parametrized further)
{
    vec3 rd = vec3(p, 1.0);

    vec4 r = sphere_normal(p);
    vec3 n = vec3(r);
    vec3 h = normalize(l + normalize(rd));
    float specular = pow(max(dot(h, n), 0.0), 50.0);
    //float diffuse = 0.5 * max(dot(n, l), 0.0); // correct
    float diffuse = max((0.5 * dot(n, l)) + 0.5, 0.0); // hack: light goes "around" a bit
    float ambient = 0.0;

    //vec2 q = vec2(0.5 - 0.5 * atan(n.z, n.x) / PI, -0.5 + 0.5 * p.y);
    // https://en.wikipedia.org/wiki/Mercator_projection
    vec2 q = vec2(0.5 - 0.5 * atan(n.z, n.x) / pi, 1.0-acos(n.y) / pi); // looks ok but is this correct?
    q.y = (1.0 - n.z/5.0/*cam-dist*/) * (2.0 * q.y - 1.0) * 0.5 + 0.5; // perspective
    vec3 color = (ambient + diffuse) * checker(c0, c1, q * t);
    color += specular * 0.75;

    return vec4(color, r.w);
}

vec4 sphere_lighted_small(vec2 p, float phi, vec3 c0, vec3 c1, vec2 t, vec3 l) // (could be parametrized further)
{
    vec3 rd = vec3(p, 1.0);

    vec4 r = sphere_normal(p);
    vec3 n = vec3(r);
    vec3 h = normalize(l + normalize(rd));
    float specular = pow(max(dot(h, n), 0.0), 50.0);
    //float diffuse = 0.5 * max(dot(n, l), 0.0); // correct
    float diffuse = max((0.5 * dot(n, l)) + 0.5, 0.0); // hack: light goes "around" a bit
    float ambient = 0.0;

    //vec2 q = vec2(0.5 - 0.5 * atan(n.z, n.x) / PI, -0.5 + 0.5 * p.y);
    // https://en.wikipedia.org/wiki/Mercator_projection
    mat2 R = mat2(vec2(cos(phi), sin(phi)), vec2(-sin(phi), cos(phi)));
    n.xy = R * n.xy;
    vec2 q = vec2(0.5 - 0.5 * atan(n.z, n.x) / pi, 1.0-acos(n.y) / pi); // looks ok but is this correct?
    q.y = (1.0 - n.z/5.0/*cam-dist*/) * (2.0 * q.y - 1.0) * 0.5 + 0.5; // perspective
    vec3 color = (ambient + diffuse) * checker(c0, c1, q * t);
    color += specular * 0.75;

    return vec4(color, r.w);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    //vec2 p = (fragCoord - vec2(iResolution.x, 0) / 2.) / iResolution.y; // suggested by pyBlob

    vec3 l = normalize(vec3(1.0, 1.0, 1.0));
    //vec3 l = vec3(sin(iTime), 0.0, cos(iTime));
    vec3 color = vec3(0);
    float big = 1.5/2.5;
    float small = big / 3.0;
    {
        vec4 s = sphere_lighted_big(p/big, vec3(0.1), vec3(0.9), vec2(8.0, 4.5), l);
        color = mix(color, vec3(s), s.w);
    }
    float phi = iTime*0.1;
    float state = cos(phi*2.0) * 0.5 + 0.5;
    vec3 tint = vec3(state, 0.5,1.0 - state);
    vec2 p0 = vec2(sin(phi), cos(phi)) * (big+small);
    {
        vec4 s = sphere_lighted_small((p-p0)/small,phi*4.0, 0.1 * tint, 0.9 * tint, vec2(4.0, 1.5), l);
        color = mix(color, vec3(s), s.w);
    }
    {
        vec4 s = sphere_lighted_small((p+p0)/small,phi*4.0, 0.1 * tint, 0.9 * tint, vec2(4.0, 1.5), l);
        color = mix(color, vec3(s), s.w);
    }

    fragColor = vec4(sqrt(color), 1.0);
}
