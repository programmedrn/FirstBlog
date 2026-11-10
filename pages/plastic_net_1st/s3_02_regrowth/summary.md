## 선택 seed (0-2)

| 조건 | n | avg acc | forgetting | plasticity drop | learning-speed drop |
|---|---|---|---|---|---|
| finetune | 3 | 17.58 ± 0.99 | 78.89 ± 1.00 | 1.52 ± 0.18 | 8.26 ± 1.59 |
| cbp | 3 | 16.22 ± 0.50 | 80.65 ± 0.51 | 0.82 ± 0.07 | 4.56 ± 0.92 |
| random_reinit | 3 | 14.94 ± 0.57 | 82.04 ± 0.58 | 0.54 ± 0.05 | 2.76 ± 0.60 |
| rung1cl | 3 | 20.50 ± 1.39 | 75.73 ± 1.44 | 1.79 ± 0.03 | 8.68 ± 1.02 |
| rung3cl | 3 | 14.03 ± 0.62 | 82.87 ± 0.60 | 0.74 ± 0.15 | 3.40 ± 0.26 |
| rung3cl_gradmax | 3 | 12.98 ± 0.62 | 83.63 ± 0.59 | 1.47 ± 0.08 | 5.62 ± 0.07 |
| dense_rung1width | 3 | 22.37 ± 1.94 | 73.64 ± 2.02 | 1.19 ± 0.26 | 4.90 ± 1.42 |
| rung2 | 3 | 18.58 ± 0.55 | 77.67 ± 0.58 | 1.86 ± 0.12 | 9.00 ± 1.28 |
| dense_rung2width | 3 | 20.19 ± 0.74 | 75.90 ± 0.76 | 1.40 ± 0.17 | 6.72 ± 0.18 |

## 판정 seed (3-5)

| 조건 | n | avg acc | forgetting | plasticity drop | learning-speed drop |
|---|---|---|---|---|---|
| finetune | 3 | 19.04 ± 0.54 | 77.38 ± 0.55 | 1.66 ± 0.15 | 8.45 ± 0.14 |
| cbp | 3 | 15.73 ± 0.60 | 81.14 ± 0.59 | 0.82 ± 0.09 | 4.31 ± 0.63 |
| random_reinit | 3 | 15.28 ± 0.58 | 81.69 ± 0.56 | 0.59 ± 0.08 | 2.69 ± 0.26 |
| rung1cl | 3 | 20.98 ± 1.60 | 75.26 ± 1.62 | 1.86 ± 0.11 | 7.33 ± 0.79 |
| rung3cl | 3 | 13.86 ± 1.28 | 82.98 ± 1.30 | 0.84 ± 0.21 | 3.52 ± 0.57 |
| dense_rung1width | 3 | 21.40 ± 1.09 | 74.60 ± 1.10 | 1.24 ± 0.27 | 5.01 ± 1.32 |
| rung2 | 3 | 19.45 ± 0.50 | 76.75 ± 0.51 | 1.99 ± 0.14 | 7.53 ± 0.81 |
| dense_rung2width | 3 | 20.10 ± 1.64 | 75.93 ± 1.62 | 1.39 ± 0.08 | 5.93 ± 1.20 |

## D-011 판정 (두 seed 세트 모두 같은 방향으로 기준을 넘어야 차이)

| 비교 | 지표 | 선택 d (기준) | 판정 d (기준) | 결론 |
|---|---|---|---|---|
| rung3cl vs rung1cl | avg acc | -6.47 (1.39) | -7.12 (1.60) | **rung3cl 나쁨** |
| rung3cl vs rung1cl | forgetting | +7.14 (1.44) | +7.72 (1.62) | **rung3cl 나쁨** |
| rung3cl vs rung1cl | plasticity drop | -1.04 (0.15) | -1.03 (0.21) | **rung3cl 나음** |
| rung3cl vs rung1cl | learning-speed drop | -5.29 (1.02) | -3.81 (0.79) | **rung3cl 나음** |
| rung1cl vs dense_rung1width | avg acc | -1.87 (1.94) | -0.42 (1.60) | 차이 없음 |
| rung1cl vs dense_rung1width | forgetting | +2.09 (2.02) | +0.66 (1.62) | 차이 없음 |
| rung1cl vs dense_rung1width | plasticity drop | +0.59 (0.26) | +0.62 (0.27) | **rung1cl 나쁨** |
| rung1cl vs dense_rung1width | learning-speed drop | +3.79 (1.42) | +2.32 (1.32) | **rung1cl 나쁨** |
| rung2 vs dense_rung2width | avg acc | -1.61 (0.74) | -0.65 (1.64) | 차이 없음 |
| rung2 vs dense_rung2width | forgetting | +1.77 (0.76) | +0.82 (1.62) | 차이 없음 |
| rung2 vs dense_rung2width | plasticity drop | +0.46 (0.17) | +0.61 (0.14) | **rung2 나쁨** |
| rung2 vs dense_rung2width | learning-speed drop | +2.28 (1.28) | +1.61 (1.20) | **rung2 나쁨** |
| rung3cl vs cbp | avg acc | -2.19 (0.62) | -1.86 (1.28) | **rung3cl 나쁨** |
| rung3cl vs cbp | forgetting | +2.22 (0.60) | +1.84 (1.30) | **rung3cl 나쁨** |
| rung3cl vs cbp | plasticity drop | -0.08 (0.15) | +0.02 (0.21) | 차이 없음 |
| rung3cl vs cbp | learning-speed drop | -1.16 (0.92) | -0.79 (0.63) | **rung3cl 나음** |
| rung3cl vs random_reinit | avg acc | -0.91 (0.62) | -1.42 (1.28) | **rung3cl 나쁨** |
| rung3cl vs random_reinit | forgetting | +0.83 (0.60) | +1.29 (1.30) | 차이 없음 |
| rung3cl vs random_reinit | plasticity drop | +0.21 (0.15) | +0.25 (0.21) | **rung3cl 나쁨** |
| rung3cl vs random_reinit | learning-speed drop | +0.64 (0.60) | +0.83 (0.57) | **rung3cl 나쁨** |
| rung3cl vs finetune | avg acc | -3.55 (0.99) | -5.18 (1.28) | **rung3cl 나쁨** |
| rung3cl vs finetune | forgetting | +3.99 (1.00) | +5.60 (1.30) | **rung3cl 나쁨** |
| rung3cl vs finetune | plasticity drop | -0.78 (0.18) | -0.82 (0.21) | **rung3cl 나음** |
| rung3cl vs finetune | learning-speed drop | -4.87 (1.59) | -4.94 (0.57) | **rung3cl 나음** |
