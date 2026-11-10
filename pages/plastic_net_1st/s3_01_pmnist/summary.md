## 선택 seed (0-2)

| 조건 | n | avg acc | forgetting | plasticity drop | learning-speed drop |
|---|---|---|---|---|---|
| finetune | 3 | 17.58 ± 0.99 | 78.89 ± 1.00 | 1.52 ± 0.18 | 8.26 ± 1.59 |
| ewc | 3 | 55.12 ± 0.85 | 29.92 ± 0.70 | 23.10 ± 0.76 | 16.73 ± 0.59 |
| cbp | 3 | 16.22 ± 0.50 | 80.65 ± 0.51 | 0.82 ± 0.07 | 4.56 ± 0.92 |
| random_reinit | 3 | 14.94 ± 0.57 | 82.04 ± 0.58 | 0.54 ± 0.05 | 2.76 ± 0.60 |
| rung2 | 3 | 18.58 ± 0.55 | 77.67 ± 0.58 | 1.86 ± 0.12 | 9.00 ± 1.28 |
| reset | 3 | 11.31 ± 0.33 | 85.78 ± 0.33 | -0.07 ± 0.10 | -0.02 ± 0.09 |
| freeze | 3 | 11.70 ± 0.42 | 0.00 ± 0.00 | 8.69 ± 0.82 | 7.44 ± 0.96 |
| planted | 3 | 16.20 ± 0.59 | 75.52 ± 0.24 | 7.99 ± 0.34 | 30.23 ± 2.25 |
| finetune_aa | 3 | 18.48 ± 0.36 | 77.99 ± 0.38 | 1.56 ± 0.08 | 8.10 ± 0.37 |

## 판정 seed (3-5)

| 조건 | n | avg acc | forgetting | plasticity drop | learning-speed drop |
|---|---|---|---|---|---|
| finetune | 3 | 19.04 ± 0.54 | 77.38 ± 0.55 | 1.66 ± 0.15 | 8.45 ± 0.14 |
| ewc | 3 | 55.21 ± 0.24 | 30.07 ± 0.34 | 22.34 ± 0.36 | 16.16 ± 0.40 |
| cbp | 3 | 15.73 ± 0.60 | 81.14 ± 0.59 | 0.82 ± 0.09 | 4.31 ± 0.63 |
| random_reinit | 3 | 15.28 ± 0.58 | 81.69 ± 0.56 | 0.59 ± 0.08 | 2.69 ± 0.26 |
| rung2 | 3 | 19.45 ± 0.50 | 76.75 ± 0.51 | 1.99 ± 0.14 | 7.53 ± 0.81 |
| reset | 3 | 11.51 ± 0.33 | 85.58 ± 0.35 | -0.03 ± 0.13 | 0.12 ± 0.12 |
| freeze | 3 | 11.35 ± 0.31 | 0.00 ± 0.00 | 8.06 ± 1.18 | 6.78 ± 0.99 |
| planted | 3 | 15.82 ± 1.37 | 75.78 ± 1.62 | 7.84 ± 0.40 | 29.52 ± 1.57 |

## D-011 판정 (두 seed 세트 모두 같은 방향으로 기준을 넘어야 차이)

| 비교 | 지표 | 선택 d (기준) | 판정 d (기준) | 결론 |
|---|---|---|---|---|
| rung2 vs finetune | avg acc | +0.99 (0.99) | +0.40 (0.54) | 차이 없음 |
| rung2 vs finetune | forgetting | -1.21 (1.00) | -0.63 (0.55) | **rung2 나음** |
| rung2 vs finetune | plasticity drop | +0.33 (0.18) | +0.33 (0.15) | **rung2 나쁨** |
| rung2 vs finetune | learning-speed drop | +0.74 (1.59) | -0.92 (0.81) | 차이 없음 |
| rung2 vs cbp | avg acc | +2.36 (0.55) | +3.72 (0.60) | **rung2 나음** |
| rung2 vs cbp | forgetting | -2.98 (0.58) | -4.39 (0.59) | **rung2 나음** |
| rung2 vs cbp | plasticity drop | +1.04 (0.12) | +1.18 (0.14) | **rung2 나쁨** |
| rung2 vs cbp | learning-speed drop | +4.44 (1.28) | +3.22 (0.81) | **rung2 나쁨** |
| ewc vs finetune | avg acc | +37.54 (0.99) | +36.17 (0.54) | **ewc 나음** |
| ewc vs finetune | forgetting | -48.96 (1.00) | -47.31 (0.55) | **ewc 나음** |
| ewc vs finetune | plasticity drop | +21.57 (0.76) | +20.68 (0.36) | **ewc 나쁨** |
| ewc vs finetune | learning-speed drop | +8.46 (1.59) | +7.70 (0.40) | **ewc 나쁨** |
| cbp vs finetune | avg acc | -1.36 (0.99) | -3.32 (0.60) | **cbp 나쁨** |
| cbp vs finetune | forgetting | +1.77 (1.00) | +3.76 (0.59) | **cbp 나쁨** |
| cbp vs finetune | plasticity drop | -0.70 (0.18) | -0.84 (0.15) | **cbp 나음** |
| cbp vs finetune | learning-speed drop | -3.70 (1.59) | -4.14 (0.63) | **cbp 나음** |
| cbp vs random_reinit | avg acc | +1.28 (0.57) | +0.45 (0.60) | 차이 없음 |
| cbp vs random_reinit | forgetting | -1.39 (0.58) | -0.55 (0.59) | 차이 없음 |
| cbp vs random_reinit | plasticity drop | +0.28 (0.07) | +0.23 (0.09) | **cbp 나쁨** |
| cbp vs random_reinit | learning-speed drop | +1.80 (0.92) | +1.63 (0.63) | **cbp 나쁨** |
| planted vs finetune | avg acc | -1.39 (0.99) | -3.22 (1.37) | **planted 나쁨** |
| planted vs finetune | forgetting | -3.36 (1.00) | -1.60 (1.62) | 차이 없음 |
| planted vs finetune | plasticity drop | +6.47 (0.34) | +6.18 (0.40) | **planted 나쁨** |
| planted vs finetune | learning-speed drop | +21.97 (2.25) | +21.07 (1.57) | **planted 나쁨** |
| reset vs finetune | avg acc | -6.27 (0.99) | -7.54 (0.54) | **reset 나쁨** |
| reset vs finetune | forgetting | +6.90 (1.00) | +8.20 (0.55) | **reset 나쁨** |
| reset vs finetune | plasticity drop | -1.59 (0.18) | -1.70 (0.15) | **reset 나음** |
| reset vs finetune | learning-speed drop | -8.28 (1.59) | -8.34 (0.14) | **reset 나음** |
