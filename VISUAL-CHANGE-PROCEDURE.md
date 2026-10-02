# VISUAL-CHANGE-PROCEDURE: Procedura Bezpiecznych Modyfikacji Wizualnych

Niniejszy dokument opisuje procedurę krok po kroku, jaką należy zastosować podczas wprowadzania jakichkolwiek zmian wizualnych i estetycznych w interfejsie GymTracker Pro v2.24.0.

---

## 1. Dopuszczony Zakres Modyfikacji
Zmiany wizualne mogą obejmować wyłącznie:
- Dopasowanie kolorów, odcieni tła, obramowań i poziomów przezroczystości (CSS Tailwind).
- Drobne korekty odstępów (margin, padding, gap) i wysokości wierszy.
- Wygląd przycisków, ikonek i etykiet (bez usuwania lub zmiany ich nazw).
- Modyfikację stylów dymków podpowiedzi (Tooltip) na wykresach Recharts.

---

## 2. Pliki Dopuszczone do Edycji Wizualnej
Tylko następujące pliki UI mogą podlegać edycji wizualnej:
- `src/index.css`
- `src/components/ModernSidebar.tsx`
- `src/components/ModernHeader.tsx`
- `src/components/ExerciseCard.tsx`
- `src/components/TitleBar.tsx`
- `src/components/WindowsTitleBar.tsx`

---

## 3. Zasady Zachowania Logiki i Testowalności (STRICT RULES)
1. **ZAKAZ usuwania selektorów `id`**: Każdy element posiadający atrybut `id` (np. `id="btn-add-week"`, `id="sidebar-nav-plan"`) MUSI zachować go w dokładnie niezmienionej formie.
2. **ZAKAZ zmiany zdarzeń `onClick` i `onChange`**: Wszelkie procedury obsługi zdarzeń (event handlery) i wywołania funkcji logiki muszą pozostać nietknięte.
3. **ZAKAZ ukrywania pól wartości**: Nie wolno ukrywać ani usuwać prezentowanych danych numerycznych, przeliczników e1RM, tonażu ani informacji o seriach.

---

## 4. Walidacja Wizualna i Porównywanie Zrzutów Ekranu (Screenshots)
Przed zatwierdzeniem jakiejkolwiek zmiany wizualnej należy wykonać procedurę weryfikacyjną:
1. Uruchom testy jednostkowe, aby upewnić się, że struktura danych nie uległa naruszeniu:
   ```bash
   npm test
   ```
2. Sprawdź poprawność typowania i lintera:
   ```bash
   npm run lint
   ```
3. Zbuduj aplikację, aby wykluczyć błędy bundlingowe:
   ```bash
   npm run build
   ```
4. Jeśli dostępne jest środowisko desktopowe z silnikiem graficznym, wykonaj porównanie wizualne:
   ```bash
   node tests/visual-compare.cjs
   ```

---

## 5. Procedura Wycofania Zmiany Wizualnej (Rollback)
W przypadku wykrycia naruszenia layoutu, zaniku selektora testowego lub niepoprawnego wyświetlania danych:
1. Wycofaj zmienione pliki z wykorzystaniem systemu kontroli wersji Git:
   ```bash
   git checkout -- src/components/
   ```
2. Zrekompiluj aplikację i upewnij się, że przywrócono stan zgodny z `UI-VISUAL-CONTRACT.md`.
