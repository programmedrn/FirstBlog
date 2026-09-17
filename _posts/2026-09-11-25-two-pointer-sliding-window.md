---
title: "Two Pointer / Sliding Window"
date: 2026-09-11
categories:
  - "알고리즘"
  - "공부"
  - "슬라이딩-윈도우"
  - "투-포인터"
excerpt: "검사해야 할 전체 구간이 주어졌을 때, 연속된 부분 구간을 확인하거나 시작과 끝의 포인터를 움직이며 조건을 깨거나 회복시키는 투 포인터와 슬라이딩 윈도우 기법을 설명합니다."
feature_text: |
  ## Two Pointer / Sliding Window
  두 포인터와 슬라이딩 윈도우 알고리즘 활용 사례
feature_image:
---

검사해야 할 전체 구간이 주어졌을 때, 연속된 부분 구간을 확인하는 경우, 그리고 부분 구간의 시작과 끝이 일정한 방향으로 움직일 때 활용할 수 있다. 시작과 끝의 포인터를 움직이며 조건을 깨거나 회복시키는 방식을 활용한다(두 포인터가 동시에 움직여야 할 수도 있음).  
구간을 조정해서 목표하는 값을 찾고자 하는 경우엔 시작 포인터와 끝 포인터를 움직이는 데에 각각 결과값에 일정한 방향의 영향을 미쳐야 한다. 당연한 얘기인 게 때때로 다른 영향을 미치면 일정한 방향으로 포인터들을 움직일 수 없게 된다. 예를 들어 시작 포인터를 움직이면 결과값이 커지고 끝 포인터를 움직이면 작아진다거나 하는 경우에 쓸 수 있다. 아래는 예시들이다.

1. 주어진 int[] 구간 내 부분 구간의 합이 target을 넘지 않는 최장 길이 찾기
```java
int len = arr.length;
int left = 0;
int sum = 0;
int longest = 0;
for(int right=0;right<len;right++){
  sum += arr[right];
  while(sum > target){
    sum -= arr[left++];
  }
  longest = Math.max(longest, right - left + 1);
}
```
2. 오름차순으로 정렬된 배열에서(중복 없음) 합이 target이 되는 쌍 찾기
```java
int last = arr.length;
int left = 0;
int right = last - 1;
int sum = 0;
while(left < right){
  sum = arr[left] + arr[right];
  if(sum == target) return new int[]{left, right};
  if(sum > target) right--;
  else left++;
}
```
3. 오름차순으로 정렬된 배열에서(중복 있음) 합이 target이 되는 쌍 찾기(예: {1, 1, 2, 2}에서 target=3인 경우)
```java
int left = 0;
int right = arr.length -1;
int sum = 0;
int count = 0;
while(left < right){
  sum = arr[left] + arr[right];
  if(sum > target) right --;
  else if(sum < target) left++;
  else{
    if(arr[left] == arr[right]){
      int size = right - left + 1;
      count += size * (size - 1) / 2;
      break;
    }
    int leftSame = left;
    int rightSame = right;
    while(arr[left] == arr[leftSame]) leftSame++;
    while(arr[right] == arr[rightSame]) rightSame--;
    int leftGroupCount = leftSame - left;
    int rightGroupCount = right - rightSame;
    count += leftGroupCount * rightGroupCount;
    left = leftSame;
    right = rightSame;
  }
}
```
