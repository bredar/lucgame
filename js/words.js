// === Word Bank (global) ===
window.WORDS = [
  // d/b pairs
  { target: "Dach", confusionType: "db", distractors: ["Bach"], minLevel: 1 },
  { target: "Bach", confusionType: "db", distractors: ["Dach"], minLevel: 1 },
  { target: "Dose", confusionType: "db", distractors: ["Bose"], minLevel: 1 },
  { target: "Dein", confusionType: "db", distractors: ["Bein"], minLevel: 1 },
  { target: "Bein", confusionType: "db", distractors: ["Dein"], minLevel: 1 },
  { target: "Ball", confusionType: "db", distractors: ["Dall"], minLevel: 1 },
  { target: "Baum", confusionType: "db", distractors: ["Daum"], minLevel: 1 },
  { target: "Brot", confusionType: "db", distractors: ["Drot"], minLevel: 2 },
  { target: "Boden", confusionType: "db", distractors: ["Doden"], minLevel: 2 },
  { target: "Decke", confusionType: "db", distractors: ["Becke"], minLevel: 2 },
  { target: "Busch", confusionType: "db", distractors: ["Dusch"], minLevel: 2 },
  { target: "Burg", confusionType: "db", distractors: ["Durg"], minLevel: 2 },
  { target: "Dieb", confusionType: "db", distractors: ["Bieb"], minLevel: 2 },
  { target: "Band", confusionType: "db", distractors: ["Dand"], minLevel: 2 },
  { target: "Birne", confusionType: "db", distractors: ["Dirne"], minLevel: 5 },
  { target: "Dirne", confusionType: "db", distractors: ["Birne"], minLevel: 5 },
  { target: "Blatt", confusionType: "db", distractors: ["Dlatt"], minLevel: 5 },
  { target: "Daumen", confusionType: "db", distractors: ["Baumen"], minLevel: 5 },
  { target: "Bad", confusionType: "db", distractors: ["Bat"], minLevel: 5 },
  // d/b pairs inside the word (both real words!)
  { target: "Laden", confusionType: "db", distractors: ["Laben"], minLevel: 4 },
  { target: "Laben", confusionType: "db", distractors: ["Laden"], minLevel: 4 },
  { target: "Leder", confusionType: "db", distractors: ["Leber"], minLevel: 5 },
  { target: "Leber", confusionType: "db", distractors: ["Leder"], minLevel: 5 },
  { target: "Nadel", confusionType: "db", distractors: ["Nabel"], minLevel: 6 },
  { target: "Nabel", confusionType: "db", distractors: ["Nadel"], minLevel: 6 },
  // t/f pairs
  { target: "Tisch", confusionType: "tf", distractors: ["Fisch"], minLevel: 3 },
  { target: "Fisch", confusionType: "tf", distractors: ["Tisch"], minLevel: 3 },
  { target: "Tafel", confusionType: "tf", distractors: ["Fafel"], minLevel: 3 },
  { target: "Topf", confusionType: "tf", distractors: ["Fopf"], minLevel: 3 },
  { target: "Feder", confusionType: "tf", distractors: ["Teder"], minLevel: 3 },
  { target: "Feld", confusionType: "tf", distractors: ["Teld"], minLevel: 3 },
  { target: "Tor", confusionType: "tf", distractors: ["For"], minLevel: 3 },
  { target: "Farbe", confusionType: "tf", distractors: ["Tarbe"], minLevel: 3 },
  { target: "Tante", confusionType: "tf", distractors: ["Fante"], minLevel: 5 },
  { target: "Faden", confusionType: "tf", distractors: ["Taden"], minLevel: 5 },
  { target: "Tasse", confusionType: "tf", distractors: ["Fasse"], minLevel: 5 },
  { target: "Finger", confusionType: "tf", distractors: ["Tinger"], minLevel: 6 },
  { target: "Fest", confusionType: "tf", distractors: ["Test"], minLevel: 6 },
  { target: "Test", confusionType: "tf", distractors: ["Fest"], minLevel: 6 },
  { target: "Tier", confusionType: "tf", distractors: ["Fier"], minLevel: 6 },
  { target: "Frosch", confusionType: "tf", distractors: ["Trosch"], minLevel: 7 },
  { target: "Turm", confusionType: "tf", distractors: ["Furm"], minLevel: 7 },
  { target: "Tuer", confusionType: "tf", distractors: ["Fuer"], minLevel: 7 },
];

window.LEVELS = [
  { id: 1, name: "Seestern",     icon: "\u2B50",       options: 2, confusionTypes: ["db"], quizWords: 6,  shooterWords: 5,  shooterSpeed: 1.0, speakTwice: true },
  { id: 2, name: "Krabbe",       icon: "\uD83E\uDD80", options: 2, confusionTypes: ["db"], quizWords: 6,  shooterWords: 6,  shooterSpeed: 1.2, speakTwice: false },
  { id: 3, name: "Seepferdchen", icon: "\uD83D\uDC1A", options: 3, confusionTypes: ["db"], quizWords: 8,  shooterWords: 8,  shooterSpeed: 1.3, speakTwice: false },
  { id: 4, name: "Delphin",      icon: "\uD83D\uDC2C", options: 3, confusionTypes: ["tf"], quizWords: 8,  shooterWords: 8,  shooterSpeed: 1.4, speakTwice: false },
  { id: 5, name: "Schildkröte",  icon: "\uD83D\uDC22", options: 3, confusionTypes: ["db","tf"], quizWords: 8,  shooterWords: 10, shooterSpeed: 1.5, speakTwice: false },
  { id: 6, name: "Hai",          icon: "\uD83E\uDD88", options: 4, confusionTypes: ["db","tf"], quizWords: 10, shooterWords: 12, shooterSpeed: 1.8, speakTwice: false },
  { id: 7, name: "Tintenfisch",  icon: "\uD83D\uDC19", options: 4, confusionTypes: ["db","tf"], quizWords: 12, shooterWords: 14, shooterSpeed: 2.2, speakTwice: false },
];

window.MAX_LEVEL = 7;

window.ENCOURAGEMENTS = [
  "Super gemacht, Luc! \uD83C\uDF1F",
  "Tinti ist stolz auf dich!",
  "Du bist ein Leseprofi!",
  "Weiter so, Champion!",
  "Wow, das war toll!",
  "Garfield sagt: Pfotastisch!",
  "Du rockst das, Luc!",
  "Miau-nifik! Einfach klasse!",
  "Tinti tanzt vor Freude!",
  "Lesemeister Luc!",
];

window.BADGES = [
  { name: "Seepferdchen", icon: "\uD83D\uDC1A", starsNeeded: 10 },
  { name: "Qualle",       icon: "\uD83E\uDEBC", starsNeeded: 20 },
  { name: "Schildkröte", icon: "\uD83D\uDC22", starsNeeded: 30 },
  { name: "Seehund",      icon: "\uD83E\uDDAD", starsNeeded: 40 },
  { name: "Wal",          icon: "\uD83D\uDC33", starsNeeded: 50 },
  { name: "Koralle",      icon: "\uD83E\uDEB8", starsNeeded: 60 },
  { name: "Muschel",      icon: "\uD83D\uDC1A", starsNeeded: 70 },
  { name: "Seestern",     icon: "\u2B50",       starsNeeded: 80 },
  { name: "Delfin",       icon: "\uD83D\uDC2C", starsNeeded: 90 },
  { name: "Krake",        icon: "\uD83D\uDC19", starsNeeded: 100 },
];

// Helper
window.shuffleArray = function(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Audio key for a word
window.wordAudioKey = function(word) {
  return 'word_' + word.toLowerCase();
};
