// Config Tailwind bersama untuk index.html & admin.html.
// Palet "dilembutkan": hijau digeser ke sage (senada logo), kuning & teal diredam.
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'forest-green': '#4f6b45',
        'forest-green-dark': '#2a3a24',
        'mint-green': '#dce6cf',
        'warm-yellow': '#f2e2a0',
        'info-teal': '#5a8d96',
        'info-teal-text': '#2f6670',
        'pure-white': '#ffffff',
        'primary': '#4f6b45',
        'on-primary': '#ffffff',
        'primary-soft': '#dce6cf',
        'on-primary-soft': '#2a3a24',
        'secondary': '#5a8d96',
        'on-secondary': '#1f1f1c',
        'secondary-soft': '#e8f0ef',
        'tertiary': '#f2e2a0',
        'on-tertiary': '#3d3410',
        'surface': '#fffdf8',
        'surface-subtle': '#faf7ef',
        'surface-muted': '#efebe0',
        'on-surface': '#1f1f1c',
        'on-surface-muted': '#55534c',
        'outline': '#7a776d',
        'outline-subtle': '#e2ddd0',
        'disabled-surface': '#e6e2d8',
        'on-disabled': '#6b685f',
      },
      fontFamily: {
        // Hybrid: judul gaya spidol, informasi tetap rapi tapi membulat
        'display': ['"Gochi Hand"', 'cursive'],
        'headline': ['"Gochi Hand"', 'cursive'],
        'title': ['"Patrick Hand"', 'cursive'],
        'body': ['"Nunito"', 'sans-serif'],
        'label': ['"Nunito"', 'sans-serif'],
      }
    }
  }
};
