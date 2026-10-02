# UI-VISUAL-CONTRACT: Kontrakt Wizualny GymTracker Pro v2.24.0

## 1. Zasada Nadrzędna
Obecny wygląd aplikacji GymTracker Pro v2.24.0 stanowi oficjalny, zamrożony wzorzec wizualny (Visual Baseline). Jakiekolwiek przyszłe modyfikacje estetyczne MUSZĄ zachować istniejący układ elementów, hierarchię nawigacji, selektory HTML `id` oraz spójność kolorystyczną.

## 2. Architektura Layoutu i Nawigacja
- **Układ Główny**: Dwukolumnowy z lewym panelem bocznym (`ModernSidebar.tsx`) o szerokości **290px** w stanie rozwiniętym (`w-[290px]`) oraz **80px** w stanie zwiniętym (`w-20`).
- **Główny Nagłówek (`ModernHeader.tsx`)**: Przypięty do góry obszaru roboczego, zawiera nazwę widoku, podtytuł, badge wersji (`v2.24.0`), wskaźnik zapisu oraz skróty akcji (np. szybki backup, profil, serwer aktualizacji).
- **Główny Kontener Treści**: Posiada usystematyzowany ogranicznik szerokości `max-w-6xl w-full mx-auto` z responsywnym marginesem wewnątrznym.

## 3. Paleta Kolorów i Motywy
- **Motyw Ciemny (Dark Mode - Domyślny)**:
  - Tło aplikacji: `bg-slate-950`
  - Tło kart i paneli: `bg-slate-900/90` lub `bg-slate-950/80`
  - Obramowania: `border-slate-800` lub `border-slate-800/80`
  - Akcenty główne: Zieleń szmaragdowa (`emerald-400`, `emerald-500`, `teal-400`)
  - Teksty: Główny `text-slate-100`, Wtórny `text-slate-400`, Osłabiony `text-slate-500`
- **Motyw Jasny (Light Mode)**:
  - Tło aplikacji: `bg-slate-50`
  - Tło kart i paneli: `bg-white`
  - Obramowania: `border-slate-200`
  - Akcenty główne: `emerald-600`, `emerald-700`

## 4. Typografia i Zestaw Czcionek
- **Czcionka Główna**: Systemowa czcionka bezszeryfowa (`font-sans`) o wysokiej czytelności.
- **Czcionka Cyfrowa & Licznikowa**: Czcionka stałoserioffowa (`font-mono`) dla wartości wagi, serii, powtórzeń, przeliczników tonażu, e1RM oraz sum kontrolnych.

## 5. Komponenty Interfejsu i Przyciski
- **Karty Ćwiczeń (`ExerciseCard.tsx`)**:
  - Nagłówek z nazwą ćwiczenia, przyciskami edycji, historii i usuwania.
  - Szybkie kontrolki zmiany ciężaru: Przetestowane przyciski `+2.5`, `-2.5`, `+5.0` oraz przyciski regulacji serii i powtórzeń (`btn-plus-sets-`, `btn-plus-reps-`).
  - Pole wyboru RPE oraz notatek.
- **Przyciski Akcji (Primary Buttons)**:
  - Zaokrąglenie `rounded-xl` lub `rounded-2xl`.
  - Stylizowany gradient szmaragdowy z cieniem `shadow-md shadow-emerald-950/30`.

## 6. Wykresy i Wizualizacja Danych
- Zbudowane w oparciu o bibliotekę `Recharts`.
- Płynne linie trendu z uśrednianiem (EMA) oraz nakładaniem wykresów tonażu, e1RM i obwodów.
- Stylizowane dymki podpowiedzi (Tooltip) dopasowane do aktywnego motywu (Dark/Light).

## 7. Skalowanie Okna i Breakpointy
- Dedykowane wsparcie dla standardowych rozdzielczości Windows:
  - Laptop 768p (1366x768)
  - Full HD 1080p (1920x1080)
  - 2K / 4K WQHD
- Obsługa natywnej skali DPI systemu Windows bez rozmywania tekstów i elementów.

## 8. Pliki Dopuszczone do Zmian Wyłącznie Wizualnych
Modyfikacje czysto estetyczne (np. korekta odcieni, zaokrągleń, przeroczystości) mogą dotyczyć wyłącznie wymienionych plików UI pod warunkiem zachowania wszystkich selektorów testowych `id`:
- `src/components/ModernSidebar.tsx`
- `src/components/ModernHeader.tsx`
- `src/components/ExerciseCard.tsx`
- `src/components/TitleBar.tsx`
- `src/components/WindowsTitleBar.tsx`
- `src/index.css`
