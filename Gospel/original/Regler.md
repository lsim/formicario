# Hvordan er reglerne?

I det følgende er ord skrevet i *kursiv* variable størrelser, der kan sættes med parametre til styreprogrammet, men som myrerne ikke kan aflæse.

Ord i `maskinskrift` er konstanter, der er læsbare af myrerne.

Efterfølgende talintervaller i parantes angiver det interval, størrelsen ligger indenfor hvis ikke andet specificeres. Væsentlige begreber skrives med **fed** første gang, de nævnes.

Et **spil** MyreKrig består et antal **kampe**. Til hver kamp vælges tilfældige værdier for de variable størrelser indenfor bruger-angivne intervaller.

Hvert myreprogram definerer en **race** af myrer. I hver kamp kæmper et antal **hold** af myrer imod hinanden. Hvert hold er af en bestemt race, men der kan godt være flere hold af samme race med i en kamp. Disse vil da være modstandere på lige fod med andre. Racen angiver blot den anvendte styrings-algoritme.

Området, som en kamp udspiller sig på er *MapWidth* (250-500) felter bredt og *MapHeight* (250-500) felter højt. Myrerne kender ikke disse størrelser, men kan regne med, at de altid vil være delelige med 64.

For hvert deltagende hold placeres en **base** et næsten tilfældigt sted på området, næsten i den forstand, at den indbyrdes afstand mellem baserne ikke bliver alt for lille.

Hvert hold starter med *StartAnts* (10-50) myrer på basen.

På et felt, hvor der ikke befinder sig en base, kan der ligger et antal **madstykker**, som myrerne kan slæbe rundt på.

En kamp forløber i **ture**. I hver tur **trækker** samtlige myrer i området i tilfældig rækkefølge. Når en myre trækker, kan den vælge mellem at:

1. Stå stille.
2. Gå 1 felt i en af retningerne nord, syd, øst eller vest.
3. Såfremt der er mad på det felt, myren står på: Gå i en retning og slæbe 1 stykke mad med.
4. Bygge en ny base. For at det kan lade sig gøre skal der udover myren selv befinde sig mindst `NewBaseAnts` (25) myrer samt `NewBaseFood` (50) stykker mad på feltet, der så vil blive fjernet idet basen bygges.

En myre kan ikke gå ind på et felt, hvor der i forvejen befinder sig `MaxSquareAnts` (100) eller flere myrer. Hvis den forsøger dette, bliver den blot stående.

En myre kan ikke slæbe mad ind på et felt, hvor der i forvejen befinder sig `MaxSquareFood` (200) eller flere stykker mad. Hvis den forsøger dette, flytter myren sig (hvis den kan), men maden bliver liggende.

Ethvert stykke mad, der slæbes ind på myrens egen base eller er overskydende ved bygning af en ny base, bliver øjeblikkeligt til en ny myre af det pågældende hold. Disse nye myrer får deres første træk i den umiddelbart efterfølgende tur.

Hver myre er udstyret med en **hjerne** i form af en begrænset mængde hukommelse. En myre har altid adgang til at læse og skrive i hjernen hos alle myrer, der befinder sig på samme felt som den selv. Udover indholdet af disse er den eneste information, en myre har adgang til, indholdet af de 5 felter, myren har mulighed for at ende sit træk på, samt værdierne af konstanterne `NewBaseAnts`, `NewBaseFood`, `BaseValue` (`NewBaseAnts` + `NewBaseFood`), `MaxSquareAnts` og `MaxSquareFood`.

Når en myre bevæger sig ind på et felt, udslettes samtlige fjendtlige myrer samt eventuel fjendtlig base på feltet.

Et myrehold's **point** er defineret som (antal myrer på holdet) + (antal baser, holdet har) × `BaseValue`, og **totalpoint** betegner summen af pointene af de to myrehold, der har flest point.

Efter hver tur placeres ny mad på området. Sålænge det samlede antal point er mindre end (*MapWidth* × *MapHeight*) / *NewFoodSpace* (15-40), placeres en klump bestående af et tilfældigt antal stykker mad (mindst *NewFoodMin* (10-30), højst *NewFoodMin* + *NewFoodDiff* (5-20)) på et tilfældigt, tomt felt på området. I stil med placering af baser er placeringen af mad ikke helt tilfældig, idet maden har størst sandsynlighed for at opstå i områder, hvor det er længe siden, der sidst er opstået mad.

En kamp slutter, når:

1. Et myrehold har opnået *WinPercent* (75) procent af totalpoint, eller
2. Der er gået *HalfTimeTurn* (10000) ture og et myrehold har opnået *HalfTimePercent* (60) procent af totalpoint, eller
3. Der er gået *TimeOutTurn* (20000) ture.

Vinderen af kampen er det hold, der ved afslutningen har flest point.
