#include <stdio.h>
#include <stdbool.h>

struct node {
  int value;
  bool include;
};

#include "one_data"

int main() {
  int sum = 0;
  int count = 0;

  for (int i = 0; i < NUM_NODES; i++) {
    struct node curr = nodes[i];
    if (curr.include) {
      sum += curr.value;
      count++;
    }
  }

  printf("%d nodes counted with average: %f\n", count, (double)sum/(double)count);
}
