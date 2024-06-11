#!/usr/bin/python3

import random

NODES = 1 << 20

print(f"Generating {NODES} nodes")

xs = [(random.randint(-(1<<31), 1<<31), random.randint(0, 1)) for _ in range(NODES)]

with open("one_data", "w") as f:
    f.write(f"#define NUM_NODES {NODES}\n")
    f.write("const struct node nodes[NUM_NODES] = {\n")
    for a, b in xs:
        f.write(f"{{ {a:6}, {b} }},\n")
    f.write("};\n")

with open("two_data", "w") as f:
    included = [x for x in xs if x[1] == 1]
    f.write(f"#define NUM_INCLUDED_NODES {len(included)}\n")
    f.write("const struct node included_nodes[NUM_INCLUDED_NODES] = {\n")
    for a, b in included:
        f.write(f"{{ {a:6} }},\n")
    f.write("};\n\n")

    excluded = [x for x in xs if x[1] == 0]
    f.write(f"#define NUM_EXCLUDED_NODES {len(excluded)}\n")
    f.write("const struct node excluded_nodes[NUM_EXCLUDED_NODES] = {\n")
    for a, b in excluded:
        f.write(f"{{ {a:6} }},\n")
    f.write("};\n")
