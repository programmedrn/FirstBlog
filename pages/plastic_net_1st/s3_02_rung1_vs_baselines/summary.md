## 선택 seed (0-2)

| 조건 | n | avg acc | forgetting | plasticity drop | learning-speed drop |
|---|---|---|---|---|---|
| finetune | 3 | 17.58 ± 0.99 | 78.89 ± 1.00 | 1.52 ± 0.18 | 8.26 ± 1.59 |
| cbp | 3 | 16.22 ± 0.50 | 80.65 ± 0.51 | 0.82 ± 0.07 | 4.56 ± 0.92 |
| rung1cl | 3 | 20.50 ± 1.39 | 75.73 ± 1.44 | 1.79 ± 0.03 | 8.68 ± 1.02 |

## 판정 seed (3-5)

| 조건 | n | avg acc | forgetting | plasticity drop | learning-speed drop |
|---|---|---|---|---|---|
| finetune | 3 | 19.04 ± 0.54 | 77.38 ± 0.55 | 1.66 ± 0.15 | 8.45 ± 0.14 |
| cbp | 3 | 15.73 ± 0.60 | 81.14 ± 0.59 | 0.82 ± 0.09 | 4.31 ± 0.63 |
| rung1cl | 3 | 20.98 ± 1.60 | 75.26 ± 1.62 | 1.86 ± 0.11 | 7.33 ± 0.79 |

## D-011 판정 (두 seed 세트 모두 같은 방향으로 기준을 넘어야 차이)

| 비교 | 지표 | 선택 d (기준) | 판정 d (기준) | 결론 |
|---|---|---|---|---|
| rung1cl vs finetune | avg acc | +2.91 (1.39) | +1.94 (1.60) | **rung1cl 나음** |
| rung1cl vs finetune | forgetting | -3.15 (1.44) | -2.12 (1.62) | **rung1cl 나음** |
| rung1cl vs finetune | plasticity drop | +0.27 (0.18) | +0.20 (0.15) | **rung1cl 나쁨** |
| rung1cl vs finetune | learning-speed drop | +0.42 (1.59) | -1.13 (0.79) | 차이 없음 |
| rung1cl vs cbp | avg acc | +4.28 (1.39) | +5.25 (1.60) | **rung1cl 나음** |
| rung1cl vs cbp | forgetting | -4.92 (1.44) | -5.88 (1.62) | **rung1cl 나음** |
| rung1cl vs cbp | plasticity drop | +0.97 (0.07) | +1.05 (0.11) | **rung1cl 나쁨** |
| rung1cl vs cbp | learning-speed drop | +4.12 (1.02) | +3.02 (0.79) | **rung1cl 나쁨** |
