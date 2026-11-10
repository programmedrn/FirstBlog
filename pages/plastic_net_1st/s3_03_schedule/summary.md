## 선택 seed (0-2)

| 조건 | n | avg acc | forgetting | plasticity drop | learning-speed drop | last-10 R[t,t] | last-10 first-100-step acc |
|---|---|---|---|---|---|---|---|
| rung4_signal | 3 | 15.71 ± 0.69 | 80.84 ± 0.71 | 1.30 ± 0.13 | 5.16 ± 0.36 | 95.29 ± 0.10 | 80.89 ± 0.32 |
| rung4_random | 3 | 14.40 ± 0.43 | 82.13 ± 0.47 | 1.10 ± 0.11 | 5.49 ± 0.23 | 95.49 ± 0.07 | 80.56 ± 0.39 |
| rung4_age | 3 | 20.41 ± 1.66 | 75.85 ± 1.70 | 1.78 ± 0.18 | 7.53 ± 1.07 | 94.81 ± 0.14 | 78.52 ± 1.10 |
| rung1cl | 3 | 20.50 ± 1.39 | 75.73 ± 1.44 | 1.79 ± 0.03 | 8.68 ± 1.02 | 94.80 ± 0.07 | 77.36 ± 0.75 |
| rung3cl | 3 | 14.03 ± 0.62 | 82.87 ± 0.60 | 0.74 ± 0.15 | 3.40 ± 0.26 | 95.84 ± 0.13 | 82.65 ± 0.20 |
| finetune | 3 | 17.58 ± 0.99 | 78.89 ± 1.00 | 1.52 ± 0.18 | 8.26 ± 1.59 | 95.06 ± 0.14 | 77.78 ± 1.87 |
| cbp | 3 | 16.22 ± 0.50 | 80.65 ± 0.51 | 0.82 ± 0.07 | 4.56 ± 0.92 | 95.77 ± 0.09 | 81.47 ± 0.72 |
| random_reinit | 3 | 14.94 ± 0.57 | 82.04 ± 0.58 | 0.54 ± 0.05 | 2.76 ± 0.60 | 96.01 ± 0.06 | 83.17 ± 0.57 |

## 판정 seed (3-5)

| 조건 | n | avg acc | forgetting | plasticity drop | learning-speed drop | last-10 R[t,t] | last-10 first-100-step acc |
|---|---|---|---|---|---|---|---|
| rung4_signal | 3 | 16.18 ± 1.21 | 80.30 ± 1.27 | 1.33 ± 0.12 | 5.29 ± 0.10 | 95.28 ± 0.03 | 80.44 ± 0.14 |
| rung4_random | 3 | 16.94 ± 0.48 | 79.56 ± 0.51 | 1.43 ± 0.22 | 5.65 ± 0.32 | 95.18 ± 0.16 | 80.09 ± 0.27 |
| rung4_age | 3 | 19.92 ± 1.45 | 76.27 ± 1.48 | 2.02 ± 0.15 | 8.30 ± 1.63 | 94.59 ± 0.07 | 77.44 ± 1.59 |
| rung1cl | 3 | 20.98 ± 1.60 | 75.26 ± 1.62 | 1.86 ± 0.11 | 7.33 ± 0.79 | 94.74 ± 0.04 | 78.41 ± 0.68 |
| rung3cl | 3 | 13.86 ± 1.28 | 82.98 ± 1.30 | 0.84 ± 0.21 | 3.52 ± 0.57 | 95.77 ± 0.12 | 82.22 ± 0.43 |
| finetune | 3 | 19.04 ± 0.54 | 77.38 ± 0.55 | 1.66 ± 0.15 | 8.45 ± 0.14 | 94.95 ± 0.07 | 77.28 ± 0.28 |
| cbp | 3 | 15.73 ± 0.60 | 81.14 ± 0.59 | 0.82 ± 0.09 | 4.31 ± 0.63 | 95.76 ± 0.01 | 81.39 ± 0.46 |
| random_reinit | 3 | 15.28 ± 0.58 | 81.69 ± 0.56 | 0.59 ± 0.08 | 2.69 ± 0.26 | 95.97 ± 0.02 | 83.28 ± 0.15 |

## D-011 판정 (두 seed 세트 모두 같은 방향으로 기준을 넘어야 차이)

| 비교 | 지표 | 선택 d (기준) | 판정 d (기준) | 결론 |
|---|---|---|---|---|
| rung4_signal vs rung1cl | avg acc | -4.79 (1.39) | -4.80 (1.60) | **rung4_signal 나쁨** |
| rung4_signal vs rung1cl | forgetting | +5.11 (1.44) | +5.04 (1.62) | **rung4_signal 나쁨** |
| rung4_signal vs rung1cl | plasticity drop | -0.49 (0.13) | -0.54 (0.12) | **rung4_signal 나음** |
| rung4_signal vs rung1cl | learning-speed drop | -3.52 (1.02) | -2.03 (0.79) | **rung4_signal 나음** |
| rung4_signal vs rung1cl | last-10 R[t,t] | +0.49 (0.10) | +0.54 (0.04) | **rung4_signal 나음** |
| rung4_signal vs rung1cl | last-10 first-100-step acc | +3.52 (0.75) | +2.03 (0.68) | **rung4_signal 나음** |
| rung4_signal vs rung4_random | avg acc | +1.31 (0.69) | -0.76 (1.21) | 차이 없음 |
| rung4_signal vs rung4_random | forgetting | -1.29 (0.71) | +0.74 (1.27) | 차이 없음 |
| rung4_signal vs rung4_random | plasticity drop | +0.20 (0.13) | -0.10 (0.22) | 차이 없음 |
| rung4_signal vs rung4_random | learning-speed drop | -0.33 (0.36) | -0.36 (0.32) | 차이 없음 |
| rung4_signal vs rung4_random | last-10 R[t,t] | -0.20 (0.10) | +0.10 (0.16) | 차이 없음 |
| rung4_signal vs rung4_random | last-10 first-100-step acc | +0.33 (0.39) | +0.36 (0.27) | 차이 없음 |
| rung4_signal vs rung4_age | avg acc | -4.70 (1.66) | -3.73 (1.45) | **rung4_signal 나쁨** |
| rung4_signal vs rung4_age | forgetting | +4.99 (1.70) | +4.03 (1.48) | **rung4_signal 나쁨** |
| rung4_signal vs rung4_age | plasticity drop | -0.49 (0.18) | -0.69 (0.15) | **rung4_signal 나음** |
| rung4_signal vs rung4_age | learning-speed drop | -2.37 (1.07) | -3.00 (1.63) | **rung4_signal 나음** |
| rung4_signal vs rung4_age | last-10 R[t,t] | +0.49 (0.14) | +0.69 (0.07) | **rung4_signal 나음** |
| rung4_signal vs rung4_age | last-10 first-100-step acc | +2.37 (1.10) | +3.00 (1.59) | **rung4_signal 나음** |
| rung4_random vs rung1cl | avg acc | -6.10 (1.39) | -4.04 (1.60) | **rung4_random 나쁨** |
| rung4_random vs rung1cl | forgetting | +6.40 (1.44) | +4.30 (1.62) | **rung4_random 나쁨** |
| rung4_random vs rung1cl | plasticity drop | -0.69 (0.11) | -0.44 (0.22) | **rung4_random 나음** |
| rung4_random vs rung1cl | learning-speed drop | -3.19 (1.02) | -1.68 (0.79) | **rung4_random 나음** |
| rung4_random vs rung1cl | last-10 R[t,t] | +0.69 (0.07) | +0.44 (0.16) | **rung4_random 나음** |
| rung4_random vs rung1cl | last-10 first-100-step acc | +3.19 (0.75) | +1.68 (0.68) | **rung4_random 나음** |
| rung4_age vs rung1cl | avg acc | -0.09 (1.66) | -1.07 (1.60) | 차이 없음 |
| rung4_age vs rung1cl | forgetting | +0.12 (1.70) | +1.01 (1.62) | 차이 없음 |
| rung4_age vs rung1cl | plasticity drop | -0.01 (0.18) | +0.15 (0.15) | 차이 없음 |
| rung4_age vs rung1cl | learning-speed drop | -1.16 (1.07) | +0.97 (1.63) | 차이 없음 |
| rung4_age vs rung1cl | last-10 R[t,t] | +0.01 (0.14) | -0.15 (0.07) | 차이 없음 |
| rung4_age vs rung1cl | last-10 first-100-step acc | +1.16 (1.10) | -0.97 (1.59) | 차이 없음 |
| rung4_signal vs rung3cl | avg acc | +1.68 (0.69) | +2.32 (1.28) | **rung4_signal 나음** |
| rung4_signal vs rung3cl | forgetting | -2.03 (0.71) | -2.68 (1.30) | **rung4_signal 나음** |
| rung4_signal vs rung3cl | plasticity drop | +0.55 (0.15) | +0.49 (0.21) | **rung4_signal 나쁨** |
| rung4_signal vs rung3cl | learning-speed drop | +1.77 (0.36) | +1.78 (0.57) | **rung4_signal 나쁨** |
| rung4_signal vs rung3cl | last-10 R[t,t] | -0.55 (0.13) | -0.49 (0.12) | **rung4_signal 나쁨** |
| rung4_signal vs rung3cl | last-10 first-100-step acc | -1.77 (0.32) | -1.78 (0.43) | **rung4_signal 나쁨** |
| rung4_signal vs finetune | avg acc | -1.87 (0.99) | -2.86 (1.21) | **rung4_signal 나쁨** |
| rung4_signal vs finetune | forgetting | +1.96 (1.00) | +2.92 (1.27) | **rung4_signal 나쁨** |
| rung4_signal vs finetune | plasticity drop | -0.23 (0.18) | -0.33 (0.15) | **rung4_signal 나음** |
| rung4_signal vs finetune | learning-speed drop | -3.10 (1.59) | -3.16 (0.14) | **rung4_signal 나음** |
| rung4_signal vs finetune | last-10 R[t,t] | +0.23 (0.14) | +0.33 (0.07) | **rung4_signal 나음** |
| rung4_signal vs finetune | last-10 first-100-step acc | +3.10 (1.87) | +3.16 (0.28) | **rung4_signal 나음** |
| rung4_signal vs cbp | avg acc | -0.51 (0.69) | +0.46 (1.21) | 차이 없음 |
| rung4_signal vs cbp | forgetting | +0.19 (0.71) | -0.84 (1.27) | 차이 없음 |
| rung4_signal vs cbp | plasticity drop | +0.48 (0.13) | +0.51 (0.12) | **rung4_signal 나쁨** |
| rung4_signal vs cbp | learning-speed drop | +0.60 (0.92) | +0.98 (0.63) | 차이 없음 |
| rung4_signal vs cbp | last-10 R[t,t] | -0.48 (0.10) | -0.48 (0.03) | **rung4_signal 나쁨** |
| rung4_signal vs cbp | last-10 first-100-step acc | -0.58 (0.72) | -0.95 (0.46) | 차이 없음 |
| rung4_signal vs random_reinit | avg acc | +0.78 (0.69) | +0.90 (1.21) | 차이 없음 |
| rung4_signal vs random_reinit | forgetting | -1.20 (0.71) | -1.39 (1.27) | **rung4_signal 나음** |
| rung4_signal vs random_reinit | plasticity drop | +0.76 (0.13) | +0.74 (0.12) | **rung4_signal 나쁨** |
| rung4_signal vs random_reinit | learning-speed drop | +2.40 (0.60) | +2.61 (0.26) | **rung4_signal 나쁨** |
| rung4_signal vs random_reinit | last-10 R[t,t] | -0.72 (0.10) | -0.70 (0.03) | **rung4_signal 나쁨** |
| rung4_signal vs random_reinit | last-10 first-100-step acc | -2.28 (0.57) | -2.83 (0.15) | **rung4_signal 나쁨** |
