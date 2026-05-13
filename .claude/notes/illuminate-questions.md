# Illuminate Trivia Pool — locked 2026-05-12

12 multiple-choice questions. Phone samples 3 at random (without replacement) per cast. 4 options each. General-knowledge, family-friendly, single-fact recall. **Correct answer marked with `*`.**

Phase 2a (phone-puzzle-author) consumes this list and hardcodes it into `src/phone/components/puzzles/Trivia.tsx` as a `const QUESTIONS: Question[]`.

```ts
type Question = {
  prompt: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
};
```

## Pool

1. **How many planets are in our solar system?**
   - 7
   - 8 *
   - 9
   - 10

2. **Which planet is known as the Red Planet?**
   - Venus
   - Jupiter
   - Mars *
   - Saturn

3. **What is the largest ocean on Earth?**
   - Atlantic
   - Indian
   - Arctic
   - Pacific *

4. **How many legs does a spider have?**
   - 6
   - 8 *
   - 10
   - 12

5. **What is the chemical symbol for gold?**
   - Go
   - Gd
   - Au *
   - Ag

6. **How many sides does a hexagon have?**
   - 5
   - 6 *
   - 7
   - 8

7. **How many strings does a standard guitar have?**
   - 4
   - 5
   - 6 *
   - 7

8. **How many players from one team are on a soccer field at once?**
   - 9
   - 10
   - 11 *
   - 12

9. **What is the tallest mountain on Earth?**
   - K2
   - Everest *
   - Denali
   - Kilimanjaro

10. **What gas do plants absorb from the air?**
    - Oxygen
    - Nitrogen
    - Carbon dioxide *
    - Hydrogen

11. **Which animal is the largest mammal on Earth?**
    - African elephant
    - Blue whale *
    - Giraffe
    - Great white shark

12. **How many continents are there?**
    - 5
    - 6
    - 7 *
    - 8
