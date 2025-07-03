# Hvordan programmerer man en myre?

Myre-algoritmerne skrives i C (ANSI C med `char` signed som default og // kommentarer tilladte). Myreprogrammerne er i hver deres fil, compiles hver for sig og linkes sammen med et styreprogram, der håndterer selve simuleringen.

Et myreprogram består i det væsentlige af tre ting:

1. En struktur, der definerer den hjerne, hver myre besidder. Der er ingen øvre grænse på størrelsen af en myres hjerne, men som det vil fremgå senere hen har størrelsen indflydelse på myreracens endelige score.

   Når en myre fødes, initialiseres den første **long** til en fuldstændigt pseudo-tilfældig værdi, for at give myrerne mulighed for at generere tilfældige tal til eget brug. Resten af strukturen initialiseres til 0.

   Denne struktur kunne f.eks. have dette udseende:
   ```c
   struct MyreHjerne {
      u_long random;
      short x,y;
      short foodx[10],foody[10];
      u_long timeout;
   };
   ```

2. En funktion, der bliver kaldt, hver gang, en myre skal foretage et træk. Denne funktions returværdi afgør så, hvad myren foretager sig i det pågældende træk.

   Funktionens prototype er:
   ```c
   int MyreFunktion(struct SquareData *felter, struct MyreHjerne *mem);
   ```

   Første parameter peger på et array med 5 elementer, med information om hvert af de 5 felter, myren kan ende sin tur på, arrangeret således:
   ```
         4
       3 0 1
         2
   ```

   Strukturen `SquareData` har følgende udformning:
   ```c
   struct SquareData {
      u_char NumAnts;
      u_char Base;
      u_char Team;
      u_char NumFood;
   };
   ```

    - `NumAnts` angiver antallet af myrer på feltet.
    - `Base` er `1` hvis der er en base på feltet, `0` ellers.
    - `Team` angiver, såfremt der er myre(r) og/eller base på feltet, hvilket hold disse tilhører. Myren er selv hold 0, og de øvrige tæller fra 1 til (antal hold)-1. Hvis der hverken er myrer eller base på feltet, indeholder `Team` 0 (altså det samme, som hvis der stod nogle af ens egne myrer på feltet).
    - `NumFood` angiver antallet af madstykker på feltet.

   Myrerutinens anden parameter peger på en kopi af den kaldte myres hjerne. Typen af denne parameter er altså en pointer til den struktur, myrens hjerne er defineret til. Hvis der står andre myrer end den kaldte på samme felt, vil der ligeledes befinde sig kopier af deres hjerner i forlængelse af den første, i den rækkefølge, de pågældende myrer er ankommet til feltet. Disse kan så tilgås som `mem[1]`, `mem[2]`, ..., `mem[felter->NumAnts-1]`. Når myrerutinen returnerer, bliver alle hjerner kopieret tilbage til deres ejermyrer.

   Myrerutinens returværdi bliver fortolket således:

   | Return Value | Action |
      |--------------|---------|
   | 0-4 | Gå til det pågældende felt, jfr. udformningen af `felter` arrayet. |
   | 0-4 + 8 | Gå til feltet og slæb 1 stykke mad med. Hvis der ikke er noget mad på det felt, myren befinder sig på, udføres blot flyttet uden at slæbe mad med. |
   | 16 | Byg en ny base. `NewBaseFood` madstykker, samt de `NewBaseAnts` myrer (udover den myre, der er i træk), der ankom først til feltet, forsvinder, og en ny base etableres. Hvis kravene til bygning af en base ikke er opfyldt, bliver myren blot stående. |

3. Det, der får det hele til at hænge sammen:

    - I toppen inkluderes `Myre.h`, der indeholder definitioner af de nødvandige strukturer, konstanter og makroer samt et par praktiske `typedef`s:
      ```c
      #include "Myre.h"
      ```

    - I bunden (eller blot under hjernedefinitionen) placeres et kald af makroen `DefineAnt`:
      ```c
      DefineAnt(name, title, func, mem)
      ```
      hvor:
        - `name` identificerer myren. Det skal være et lovligt C-variabelnavn.
        - `title` er en streng på højst 10 tegn, der angiver myrens navn, som det fremgår i programmets output.
        - `func` er navnet på myrefunktionen.
        - `mem` er typen af myrens hjerne.

      Det kunne f.eks. se således ud:
      ```c
      DefineAnt(EksempelMyre, "Eksempel", EksempelFunktion, struct EksempelHjerne)
      ```

For at de beskrevne regler overholdes, er der følgende naturlige restriktioner på myreprogrammerne:

- Et myreprogram må ikke inkludere andet end `Myre.h` og må ikke referere til nogen variable eller funktioner udenfor myrens egen fil. En enkelt undtagelse til denne regel er `assert()`, der er til rådighed for myrerne.
- En myre må ikke tilgå andre informationer end hvad den får givet i kraft af de 5 felter i `felter`-arrayet og de `felter->NumAnts` myrer i `mem`-arrayet.
- Myrerne må ikke kommunikere med hinanden på andre måder end ved den adgang til hinandens hjerner, de har, når de står på samme felt. Det er således ikke tilladt at erklære nogen globale eller statiske variable.
