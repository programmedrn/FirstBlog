---
title: "Dijsktra Algorithm"
date: 2026-09-05
categories:
  - "알고리즘"
  - "공부"
  - "다익스트라"
excerpt: "다익스트라 알고리즘은 출발 노드에서 각 노드까지의 최소 비용을 계산하는 알고리즘으로, 음수 비용이 없는 경우에 적합합니다."
feature_text: |
  ## Dijsktra Algorithm
  최소 비용 경로를 찾는 다익스트라 알고리즘의 원리와 구현
feature_image:
---

다익스트라 알고리즘은 여러 노드가 있고 노드 가에 연결에 비용이 발생할 때, 출발 노드에서 각 노드까지 최소 비용을 조사하는 알고리즘이다. 예를 들어 a-b에 1, b-c에 1, a-c에 1이라면 a-b-c의 2보다 a-c의 1이 효율적임을 계산하는 알고리즘이다. 필요한 정보는 출발 노드, 노드와 노드 사이의 비용이다.  
각 노드에서 접근할 수 있는 노드들과 각 비용을 확인해둔 뒤 최소 비용을 정리한 표에 업데이트하고, 업데이트 된 노드는 다시 인접 노드들로의 비용을 갱신하게끔 만드는 과정을 갱시할 필요가 없을 때까지 반복한다.  
가장 적은 비용부터 점검하기 때문에 각 노드로의 최소 비용을 항상 보장할 수 있다. 만약 비용이 음수인 경우가 있다면 벨만-포드 알고리즘을 사용해야 한다. 음수는 택할수록 유리하고 기존 최소 비용이 보장되지 않기 때문이다.

```java

public int[] dijkstra(int[][] edgeCost, int nodeCount){
  // 각 노드별 연결된 edge 목록
  List<int[]>[] edgePerNodes = new List[nodeCount];
  for(int i=0;i<nodeCount;i++) edgePerNodes[i] = new ArrayList<>();
  // 0: 출발 노드, 1: 도착 노드, 2: 비용
  for(int[] ec : edgeCost) edgePerNodes[ec[0]].add(new int[]{ec[1], ec[2]});

  // 출발점
  int start = 0;

  // 0: 노드 번호
  // 1: 비용
  // 정보가 갱신된 노드까지의 최소값. 우선순위 큐에서 가장 작은 cost를 먼저 계산해야 한다. 왜냐하면 큰 cost부터 한 경우 cost를 줄일 수 있었음에도 이미 갱신될 차례가 지나가버릴 수 있기 때문이다.
  PriorityQueue<int[]> pq = new PriorityQueue<int[]>((a, b) -> a[1] - b[1]);
  int[] costs = new int[nodeCount];
  Arrays.fill(costs, Integer.MAX_VALUE);
  costs[start] = 0;

  pq.offer(new int[]{start, 0});
  while(!pq.isEmpty()){
    int[] now = pq.poll();
    int nowNode = now[0];
    int nowCost = now[1];
    if(nowCost > costs[nowNode]) continue;

    for(int[] elem : edgePerNodes[nowNode]){
      // 갱신될 필요가 없다(이전이 더 적은 비용)
      if(costs[nowNode] + elem[1] >= costs[elem[0]]) continue;

      // 갱신된 경우 pq에 새로 추가해준다.
      costs[elem[0]] = costs[node] + elem[1];
      pq.offer(new int[]{elem[0], costs[elem[0]]});
    }
  }
  return costs;
}
```

애초에 출발 노드가 있기 때문에 방향성이 있는 경우를 상정한 거지만 방향성이 없는 경우에도 사용할 수 있다. 다만 무방향인 경우 양쪽 방향인 것으로 생각해서 양쪽으로 값을 모두 주면 된다.  
만약 비용이 모두 같다면 BFS로 찾는 게 좋을 수 있다. 하지만 비용에 차이가 있고 모두 양수라면 다익스트라 알고리즘을 사용하자.
