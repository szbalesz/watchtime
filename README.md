<div align="center">
  
  # ⚡ StreamElements Watchtime Panel
  
  **Egy modern és letisztult felület a Twitch nézési időd és pontjaid követésére.**

  [![Live Demo](https://img.shields.io/badge/Live_Demo-watchtime.szbalesz.com-9146FF?style=for-the-badge&logo=twitch&logoColor=white)](https://watchtime.szbalesz.com)
  [![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
  [![No Database](https://img.shields.io/badge/Database-No_DB-10B981?style=for-the-badge&logo=sqlite&logoColor=white)]()
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

> [!NOTE]
> 🟢 **Élőben kipróbálható:** [watchtime.szbalesz.com](https://watchtime.szbalesz.com)  
> *Lekérdezd le a nézési idődet és pontjaidat bármelyik StreamElements rendszert használó Twitch csatornán egyetlen kattintással!*

## ✨ Főbb Funkciók

* 🔍 **Villámgyors Keresés:** Néző- és csatornanév alapján azonnali lekérdezés.
* 🏆 **Saját Ranglista:** Twitch bejelentkezés után a rendszer végignézi a követett csatornáidat, és generál egy személyes toplistát a legtöbbet nézett streamerekből.
* 🔗 **Okos URL-ek & Megosztás:** A `/csatornanev/felhasznalonev` formátumú linkek azonnal betöltik az adatokat, és közösségi oldalakon (pl. Discord) szép előnézeti kártyát (OpenGraph) adnak.
* 🌓 **Modern UI/UX:** Kijelzőt kitöltő, üveg hatású (Glassmorphism) dizájn, finom animációk, asztali és mobil eszközökre egyaránt optimalizálva.
* ⚡ **Gyorshivatkozások:** Egyetlen kattintás a kiválasztott csatorna hivatalos StreamElements leaderboardjára, vagy a Lurkology oldalára.

---

## 🛡️ Adatvédelem és Biztonság (No-DB)

> [!IMPORTANT]
> **Ez az alkalmazás SEMMILYEN adatot nem tárol szerveroldalon.** Nincs mögötte adatbázis. A lekérdezett statisztikák és a profilod adatai kizárólag a böngésződben és a memóriában léteznek a munkamenet idejéig.

* **Twitch Hitelesítés (OAuth):** A bejelentkezés pusztán egy olvasható (Read-Only) hozzáférést kér a követett csatornáid listájához a ranglista elkészítéséhez.
* Nincsenek rejtett nyomkövetők és nem mentjük a keresési előzményeidet. A kód 100%-ban nyílt forráskódú és transzparens.

---

## 🛠️ Használt Technológiák

Az oldal a legújabb webes sztenderdek szerint épült fel:

* **Framework:** Next.js (App Router)
* **Dizájn:** Tailwind CSS
* **Autentikáció:** NextAuth.js
* **Adatforrások:** StreamElements Kappa API & Twitch Helix API

---

<div align="center">
  <sub>Készítette: <b><a href="https://szbalesz.com">szbalesz</a></b> | Licensz: MIT</sub>
</div>