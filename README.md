# 📝 TestApp - Aplikacja do tworzenia i rozwiązywania testów

## 📋 Opis projektu

TestApp to prosta aplikacja webowa do tworzenia, zarządzania i rozwiązywania testów. Aplikacja działa całkowicie w przeglądarce i przechowuje dane w localStorage.

## 🚀 Uruchomienie

### Metoda 1: Bezpośrednie otwarcie pliku
1. Otwórz plik `index.html` w przeglądarce

### Metoda 2: Serwer lokalny (zalecane)
```bash
cd TestApp

# Python 3
python -m http.server 8000

# Node.js (jeśli masz zainstalowany http-server)
npx http-server

# PHP
php -S localhost:8000
```

Następnie otwórz http://localhost:8000 w przeglądarce.

## 📁 Struktura projektu

```
test_app/
├── index.html          # Główny plik HTML
├── styles.css          # Style CSS
├── app.js              # Logika aplikacji JavaScript
├── szablon_testu.csv   # Przykładowy plik CSV z pytaniami
└── README.md           # Dokumentacja
```

## 🔧 Funkcjonalności

### 1. Dodaj test (zakładka)
- Wprowadzanie nazwy testu
- Wybór typu testu (jednokrotny/wielokrotny wybór)
- Import pytań z pliku CSV
- Podgląd zaimportowanych pytań
- Możliwość pobrania szablonu CSV

### 2. Testy (zakładka)
- Lista wszystkich zapisanych testów
- Informacje o każdym teście (liczba pytań, typ, data utworzenia)
- Możliwość uruchomienia testu
- Możliwość usunięcia testu

### 3. Wyniki (zakładka)
- Historia wszystkich rozwiązanych testów
- Wyświetlanie punktów (np. 8/10)
- Wyświetlanie procentowego wyniku
- Data i godzina rozwiązania testu
- Możliwość usunięcia wyniku

### 4. Ekran rozwiązywania testu
- Centralne wyświetlanie pytania
- Lista odpowiedzi do wyboru
- Pasek postępu
- Przyciski nawigacji (Poprzednie/Dalej)
- Możliwość przerwania testu

### 5. Ekran wyniku
- Ikona i komunikat zależny od wyniku
- Wyświetlanie punktów i procentów
- Możliwość ponownego rozwiązania testu
- Powrót do listy testów

## 📄 Format pliku CSV

### Struktura
```csv
pytanie;odpowiedz1;odpowiedz2;odpowiedz3;odpowiedz4;poprawna
```

### Opis kolumn
| Kolumna | Opis |
|---------|------|
| `pytanie` | Treść pytania |
| `odpowiedz1-4` | Możliwe odpowiedzi (min. 2, max. 4) |
| `poprawna` | Numer poprawnej odpowiedzi (1-4) |

### Przykład
```csv
pytanie;odpowiedz1;odpowiedz2;odpowiedz3;odpowiedz4;poprawna
Ile to 2+2?;2;3;4;5;3
Stolica Polski?;Kraków;Warszawa;Gdańsk;Poznań;2
```

### Wielokrotny wybór
Dla testów z wielokrotnym wyborem, w kolumnie `poprawna` możesz podać kilka numerów oddzielonych przecinkiem:
```csv
Które z tych są owocami?;Jabłko;Marchew;Gruszka;Ziemniak;1,3
```

### Wskazówki
- Używaj średnika (`;`) jako separatora
- Pierwszy wiersz to nagłówek (jest pomijany)
- Kodowanie pliku: UTF-8
- Puste odpowiedzi są automatycznie usuwane

## 💾 Przechowywanie danych

Aplikacja wykorzystuje `localStorage` do przechowywania:
- **testApp_tests** - lista zapisanych testów
- **testApp_results** - historia wyników

Dane są automatycznie zapisywane przy każdej zmianie.

## 🎨 Design

- Responsywny design (działa na komputerach i urządzeniach mobilnych)
- Nowoczesny, czytelny interfejs
- Kolorowe oznaczenia wyników (zielony = dobry, żółty = średni, czerwony = słaby)
- Animacje i przejścia dla lepszego UX

## 🔒 Bezpieczeństwo

- Wszystkie dane są przechowywane lokalnie w przeglądarce
- Brak komunikacji z zewnętrznymi serwerami
- Treści użytkownika są escapowane przed wyświetleniem (ochrona przed XSS)

## 📱 Kompatybilność

Aplikacja działa w nowoczesnych przeglądarkach:
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 📝 Licencja

Projekt do użytku własnego i edukacyjnego.
