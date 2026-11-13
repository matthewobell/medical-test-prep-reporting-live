// Public website identifiers only. Never put administrator credentials here.
const TEST_WEBSITE = 'https://matthewobell.github.io/medical-test-prep-reporting/';
const PROJECTS = Object.freeze({test: 'medical-test-prep-ads-test', production: 'medical-test-prep'});

export function validateReportingConfig(input) {
  const environment = input?.environment;
  const project = Object.hasOwn(PROJECTS, environment) ? PROJECTS[environment] : null;
  const firebase = input?.firebase;
  if (!project || firebase?.projectId !== project || firebase.authDomain !== project + '.firebaseapp.com' ||
      ![project + '.firebasestorage.app', project + '.appspot.com'].includes(firebase.storageBucket) ||
      typeof firebase.messagingSenderId !== 'string' || !/^\d+$/.test(firebase.messagingSenderId) ||
      typeof firebase.appId !== 'string' || !firebase.appId.startsWith('1:' + firebase.messagingSenderId + ':web:') ||
      typeof firebase.apiKey !== 'string' || !firebase.apiKey.trim() ||
      typeof input.siteKey !== 'string' || !input.siteKey.trim() || input.region !== 'us-central1' ||
      input.functionName !== 'get_ad_report') throw Error('Reporting settings do not match the selected project.');
  if (environment === 'production' && firebase.messagingSenderId === '311713181496') {
    throw Error('Production cannot use the test app registration.');
  }
  const website = new URL(input.websiteBase);
  if (website.protocol !== 'https:' || website.username || website.password || website.search || website.hash ||
      !website.pathname.endsWith('/') ||
      (environment === 'test' ? website.href !== TEST_WEBSITE : website.href.startsWith(TEST_WEBSITE))) {
    throw Error('Reporting needs the correct website for this environment.');
  }
  return Object.freeze({...input, firebase:Object.freeze({...firebase}), websiteBase:website.href,
    projectLabel:environment === 'test' ? 'test project' : 'live project',
    catalogLabel:environment === 'test' ? 'test catalog' : 'live catalog',
    publishedMediaPrefix:'https://storage.googleapis.com/' + project + (environment === 'test' ? '' : '-ads') + '-published-media/',
    draftPreviewUrl:'https://' + input.region + '-' + project + '.cloudfunctions.net/preview_ad_asset'});
}

export const reportingConfig = validateReportingConfig({
  environment: 'production',
  websiteBase: 'https://matthewobell.github.io/medical-test-prep-reporting-live/',
  region: 'us-central1',
  functionName: 'get_ad_report',
  siteKey: '6LeDox4uAAAAAEvVHgqBBpP0J3FNar-nE9Jzb_6o',
  firebase: {
    apiKey: 'AIzaSyBWe_6sDJOTmsNoRbuPnVHISA8jlwnDab8',
    authDomain: 'medical-test-prep.firebaseapp.com',
    projectId: 'medical-test-prep',
    storageBucket: 'medical-test-prep.firebasestorage.app',
    messagingSenderId: '106764694288',
    appId: '1:106764694288:web:b0aa0d15921ee12d956b95',
    measurementId: 'G-F46FLL5GZH'
  }
});
