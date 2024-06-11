#include <stdio.h>
#include <stdbool.h>

struct node {
  int value;
};

#include "two_data"

int main() {
  int sum = 0;

  for (int i = 0; i < NUM_INCLUDED_NODES; i++) {
    sum += included_nodes[i].value;
  }

  printf("%d nodes counted with average: %f\n", NUM_INCLUDED_NODES, (double)sum/(double)NUM_INCLUDED_NODES);
}
