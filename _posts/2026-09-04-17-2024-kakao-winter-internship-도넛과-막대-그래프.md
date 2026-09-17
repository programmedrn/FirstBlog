---
title: "2024 KAKAO WINTER INTERNSHIP 도넛과 막대 그래프"
date: 2026-09-04
categories:
  - "난이도2"
  - "Java"
  - "코딩테스트"
  - "프로그래머스"
  - "그래프"
excerpt: "도넛, 막대, 8자 모양의 그래프 구조를 분석하여 외부 점과 각 그래프의 개수를 구하는 알고리즘을 구현했습니다."
feature_text: |
  ## 2024 KAKAO WINTER INTERNSHIP 도넛과 막대 그래프
  그래프 특징 노드를 활용한 유형별 그래프 구분 및 계산
feature_image:
---

https://school.programmers.co.kr/learn/courses/30/lessons/258711  
도넛모양 그래프, 막대모양 그래프, 8자모양 그래프와 외부 점, 그리고 그 점에서 각 그래프로 그려진 간선이 있는데 이 형태가 int[][] edges의 형태로 주어진다. 각 그래프의 모양은 규칙이 있으며 점들은 번호가 부여되어있다. 모든 간선은 방향성이 있어 edges[n]이 {a, b} 일 때 a->b 의 형태가 된다. 외부 점은 어떤 그래프에도 속해있지 않으며 그 점에서 각각의 그래프 위의 어느 한 점을 향하는 간선이 추가된 상태이다.  
문제는 간선의 기록만 보고 외부점의 번호가 몇 번인지  
도넛모양 그래프는 몇 개인지  
막대모양 그래프는 몇 개인지  
8자모양 그래프는 몇 개인지  
찾아야 하는 것이다.  
그래프는 반드시 2개 이상 존재한다.

문제를 처음 봤을 때 그래프를 어떻게 구현해야 하나 걱정했다. 이후에 외부점은 들어오는 선 없이 나가기만 한다는 점에서 외부점과 그 간선들을 제외하면  되겠다고 생각했고 또한 그래프가 반드시 둘 이상 존재하므로 둘 이상으로 나가기만 하는 노드는 외부점 뿐이라고 확신했다. 다만 이후에 그래프를 모두 그려보려 했으며 각각을 HashMap과 HashSet 등으로 기록하려 했다. 심지어 처음에는 merge sort를 구현해서 map 안 쓰고 정렬하려 했다. index 유지가 불가한데도. 그래프 형태 판단은 node개수와 edge개수로 충분히 구분이 가능한 상황이었다.  
하지만 결국 구현 실패 및 복잡도에 자신이 없었으며 AI한테 물어본 결과 각 그래프의 특징 노드가 존재함을 알게 됐다. 8자 모양 그래프는 반드시 가운데 노드가 존재해 나가는 선 2개, 들어오는 선 2개 이상(외부점에서 그을 수 있으므로)인 가운데 노드가 존재했고 막대 노드는 아무 곳으로도 나가지 않는데 들어오는 선만 하나 이상인 막대 그래프의 끝점이 존재했다. 도넛 그래프는 모두 동일하므로 특징이 없었는데 외부점에서 선을 그은 점을 찾는다 해도 그 점은 사실상 8자 모양에서 가운데가 아닌 점과 구분할 수 없는 상태였으므로 알 수 없다. 다만 외부점에서 각 그래프로 하나씩 간선을 그었으므로 해당 노드에서 나간 간선 수를 세면 전체 그래프 수를 알 수 있고, 여기서 막대와 8자의 개수를 빼면 된다.
```java
class Solution {
    
   
    public int[] solution(int[][] edges) {
        int[] answer = {0, 0, 0, 0};
        int MAX = 1000001;
        
        int len = edges.length;
        int[] in = new int[MAX];
        int[] out = new int[MAX];
        
        for(int i=0;i<len;i++){
            out[edges[i][0]]++;
            in[edges[i][1]]++;
        }
        
        int loopCount = 0;
        for(int i=0;i<MAX;i++){
            if(in[i] == 0 && out[i] > 1) {
                answer[0] = i;
                loopCount = out[i];
                continue;
            }
            if(out[i] == 0 && in[i] > 0) answer[2]++;
            if(out[i] >= 2) answer[3]++;
        }
        
        answer[1] = loopCount - answer[2] - answer[3];
        
        return answer;
    }
}
```

HashMap과 HashSet의 사용법을 엄청 찾아보고 결국엔 아무것도 쓰지 않았다. 사용법은 복기를 위해 남긴다.  
map.put(key, value)  
map.remove(key)  
Entry<KEY, VALUE> map.entrySet()  
Set<KEY> map.keySet()  
map.size()

set.add(element)  
set.remove(element)  
set.size()
