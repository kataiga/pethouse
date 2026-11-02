/** Reference catalogue: French is the primary locale. Every key here must exist in `en`. */
export const fr = {
  common: {
    retry: 'Réessayer',
  },
  language: {
    label: 'Langue',
    fr: 'Français',
    en: 'English',
  },
  theme: {
    label: 'Affichage',
    dark: 'Nuit',
    light: 'Jour',
  },
  welcome: {
    eyebrow: 'Aquariums · terrariums · paludariums',
    tagline: 'Aquariums, terrariums et paludariums, entretenus à plusieurs.',
  },
  auth: {
    fields: {
      displayName: 'Prénom ou pseudo',
      email: 'E-mail',
      password: 'Mot de passe',
    },
    signIn: {
      title: 'Connexion',
      submit: 'Se connecter',
      toSignUp: 'Pas encore de compte ? Créer un compte',
    },
    signUp: {
      title: 'Créer un compte',
      submit: 'Créer mon compte',
      toSignIn: 'Déjà un compte ? Se connecter',
    },
    errors: {
      emailInvalid: 'Saisis une adresse e-mail valide.',
      passwordRequired: 'Saisis ton mot de passe.',
      passwordTooShort: 'Au moins {{count}} caractères.',
      passwordTooLong: 'Ce mot de passe est trop long.',
      displayNameRequired: 'Indique comment les membres de ton foyer t’appellent.',
      displayNameTooLong: 'Ce nom est trop long.',
      invalidCredentials: 'E-mail ou mot de passe incorrect.',
      emailTaken: 'Un compte existe déjà avec cet e-mail.',
      rejected: 'Le serveur a refusé ces informations. Vérifie-les et réessaie.',
      network: 'Serveur injoignable. Vérifie ta connexion et réessaie.',
    },
  },
  session: {
    loading: 'Ouverture de ta session…',
    unreachable: {
      title: 'Serveur injoignable',
      body: 'Ta session est conservée. Vérifie ta connexion puis réessaie.',
    },
  },
  home: {
    eyebrow: 'Pethouse',
    greeting: 'Bonjour {{name}}',
    households: {
      title: 'Tes foyers',
      empty: 'Tu ne fais partie d’aucun foyer.',
      error: 'Impossible de charger tes foyers.',
    },
    signOut: 'Se déconnecter',
  },
  notFound: {
    title: 'Cette page n’existe pas',
    back: 'Retour à l’accueil',
  },
};
