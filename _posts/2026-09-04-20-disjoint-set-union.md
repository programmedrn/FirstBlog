---
title: "Disjoint Set Union"
date: 2026-09-04
categories:
  - "알고리즘"
  - "공부"
  - "DSU"
excerpt: "방향성이 없는 간선으로 연결된 노드들을 그룹화하는 DSU 알고리즘의 개념과 구현 방법을 설명하고 크루스칼 알고리즘과의 연관성을 다룹니다."
feature_text: |
  ## Disjoint Set Union
  연결된 노드들의 묶음을 관리하는 DSU와 크루스칼 활용
feature_image:
---

방향성이 없이 연결된 노드들을 이어진 노드끼리 묶을 때 쓰는 방법.  
개념은 이렇다.  
두 노드를 잇고 있는 엣지들의 묶음이 주어진다고 하자. 할 일은 연결된 노드들 중 아무거나 대표 노드로 두고 각 노드들을 해당 대표노드의 아래에 두는 것이다.  
초기상태는 아래와 같다.
```java
int[] parent = new int[n];
int[] size = new int[n];
for(int i=0;i<n;i++) {parent[i] = i; size[i] = 1;}
```
항상 최상위 부모를 찾아 연산할 것이기 때문에 아래가 먼저 필요하다.
```java
int findParent(int x){
  while (parent[x] != x){
    parent[x] = parent[parent[x]]; // 부모의 부모가 내 부모. 한 단계 더 위의 부모가 있을 수 있으므로 항상 대표자를 찾을 땐 재귀해야 한다.
    x = parent[x]; // 부모를 찾을 때까지 반복
  }
  return x;
}
```
이제 새 노드가 추가됐다고 했을 때 edge에 대한 대처법이다. 간선에 방향이 없으며 각 대표노드는 무작위로(읽힌 순서대로) 선정됐음을 기억하자.
```java
boolean union(int a, int b){
  int parentA = findParent(a);
  int parentB = findParent(b);
  if( parentA == parentB ) return false; // 둘의 조상이 같다. 즉 이미 둘은 한 그룹이다. 그러니까 이런 false가 처음이라면 이번 간선이 추가되면서 처음으로 사이클이 됐다는 뜻이다.
  if(size[parentA] < size[parentB]) {int temp = parentA; parentA = parentB; parentB = temp;} // 이제 반드시 parentA가 속한 그룹의 크기가 크거나 같다.
  parent[parentB] = parentA; // 이제 B그룹의 대표가 parentA를 갖게 됐다. 그러니까 이전까지 parentB를 바라보던 노드들에겐 부모까지 1depth가 더 생긴 거다.
  size[parentA] += size[parentB]; // 이제 size[b]는 무의미한 정보이다. 그저 parentA를 만나기 전까지 B그룹의 크기일 뿐이다.
  return true;
}
```
조회할 땐 parent를 반복해야 함을 기억하자.

이 알고리즘을 언제 쓸 수 있을까?  
노드간에 상하 관계가 적고 간선의 방향이 없으며 그들의 묶음을 형성하는 것이 중요할 때 쓰면 되겠다. 특히 간선이 하나씩 추가되는 상황일 때 유리하다. 관련 알고리즘으로 크루스칼 알고리즘이 있다.  
크루스칼 알고리즘은 그래프 내에서 모든 노드를 잇는 간선을 간선별 비용이 존재할 때 사이클 없이 최소 비용으로 선정하는 문제를 해결하는 알고리즘이다. 그러니까 n개 노드를 잇기 위해 n-1개 간선을 최소 비용으로 선정하는 것이다. DSU를 알게 됐으면 해답은 간단하다. 간선을 비용에 대해 오름차순으로 정렬하고 가장 값싼 노드부터 추가하며 cycle이 발생하면 건너뛰는 것이다. cycle 발생 여부를 위의 union 함수에서 return false, 즉 두 노드의 부모가 같은 경우, 다시 말해 이미 두 노드가 한 그룹 안에 속해 있는 경우로 구분할 수 있다.
