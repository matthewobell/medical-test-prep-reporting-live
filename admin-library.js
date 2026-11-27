import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, setPersistence, browserSessionPersistence, onAuthStateChanged, GoogleAuthProvider,
  signInWithPopup, signOut, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app-check.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-functions.js';
import { reportingConfig as config } from './reporting-config.js';

const $ = id => document.getElementById(id);
const app = initializeApp(config.firebase, 'staff-reporting');
const auth = getAuth(app);
const fetchLibrary = httpsCallable(getFunctions(app, config.region), 'get_admin_library');
let user = null, catalog = null, generation = 0, appCheck, timer, ready = false, authBusy = false;
const fetchDrafts = httpsCallable(getFunctions(app, config.region), 'get_ad_drafts');
const persistDraft = httpsCallable(getFunctions(app, config.region), 'save_ad_draft');
const fetchReview = httpsCallable(getFunctions(app, config.region), 'review_ad_draft');
const requestCampaignApproval = httpsCallable(getFunctions(app, config.region), 'approve_campaign');
let campaignApprovalRequest = 0, campaignApprovalBusyTicket = null, campaignApprovalPanel = null;
const requestCreativeActivation = httpsCallable(getFunctions(app, config.region), 'activate_creative');
let activationRequest = 0, activationBusyTicket = null, activationPanel = null;
const requestCreativeApproval = httpsCallable(getFunctions(app, config.region), 'approve_creative');
let approvalRequest = 0, approvalBusyTicket = null, approvalPanel = null;
const requestCreativeCreate = httpsCallable(getFunctions(app, config.region), 'create_creative');
const requestCampaignCreate = httpsCallable(getFunctions(app, config.region), 'create_campaign');
const prepareCampaignPublish = httpsCallable(getFunctions(app, config.region), 'prepare_campaign_publish');
const publishCampaignDraft = httpsCallable(getFunctions(app, config.region), 'publish_campaign_draft');
const prepareCreativePublish = httpsCallable(getFunctions(app, config.region), 'prepare_creative_publish');
const publishCreativeDraft = httpsCallable(getFunctions(app, config.region), 'publish_creative_draft');
const requestPublishedPreview = httpsCallable(getFunctions(app, config.region), 'preview_published_media');
let publishedPreviewRequest = 0;
const requestCampaignResume = httpsCallable(getFunctions(app, config.region), 'resume_campaign');
let resumeRequest = 0, resumeBusyTicket = null, resumePanel = null;
const requestSponsorActivate = httpsCallable(getFunctions(app, config.region), 'activate_sponsor');
const requestSponsorPause = httpsCallable(getFunctions(app, config.region), 'pause_sponsor');
let sponsorStatusRequest = 0, sponsorStatusBusy = null, sponsorStatusPanel = null;
const requestSponsorCreate = httpsCallable(getFunctions(app, config.region), 'create_sponsor');
const requestSponsorEdit = httpsCallable(getFunctions(app, config.region), 'edit_sponsor');
const requestRecordManage = httpsCallable(getFunctions(app, config.region), 'manage_ad_record');
let sponsorCreate = null, sponsorCreateBusy = false, sponsorCreateTicket = 0;
const requestCreativePause = httpsCallable(getFunctions(app, config.region), 'pause_creative');
let creativePauseBusy = false, creativePauseRequest = 0;
const requestCampaignPause = httpsCallable(getFunctions(app, config.region), 'pause_campaign');
const requestCampaignRollback = httpsCallable(getFunctions(app, config.region), 'campaign_rollback');
let rollbackRequest = 0, rollbackBusyTicket = null, rollbackPanel = null;
let campaignPauseBusy = false, pauseRequest = 0;
let reviewRequest = 0;
const prepareUpload = httpsCallable(getFunctions(app, config.region), 'prepare_ad_upload');
const completeUpload = httpsCallable(getFunctions(app, config.region), 'complete_ad_upload');
const removeUpload = httpsCallable(getFunctions(app, config.region), 'remove_ad_asset');
const fetchMediaLibrary = httpsCallable(getFunctions(app, config.region), 'get_media_library');
const createMediaFolder = httpsCallable(getFunctions(app, config.region), 'create_media_folder_record');
const moveMediaAsset = httpsCallable(getFunctions(app, config.region), 'move_media_asset_record');
let uploadTask = null, previewUrl = null;
let drafts = [], mediaLibrary = {folders:[],assets:[]}, editor = null, editorRead = null, dirty = false, draftBusy = false, draftRequest = 0;
let section = 'campaigns', selected = null, archiveMode = false;
let remembered = {}, detailTab = 'Overview';
let emailLink = isSignInWithEmailLink(auth, window.location.href) ? window.location.href : '';
const labels = { name:'Name', sponsor_id:'Sponsor', campaign_id:'Campaign', enabled:'Enabled', approved:'Approved',
  logo_url:'Logo link', placement:'Placement', exam:'Exam', module:'Module', start_at:'Starts (inclusive)', end_at:'Ends (exclusive)',
  platforms:'Platforms', exclusive:'Exclusive booking', share_schedule:'Campaign exposure share schedule',
  creative_overrides:'Exam/module creative overrides', rotation_weight:'Creative rotation weight', eyebrow_text:'Eyebrow text',
  headline:'Headline', body_text:'Body text', cta_text:'Button text', click_url:'Destination link', disclaimer_text:'Disclosure',
  media_type:'Media type', image_url:'Image link', video_url:'Video link', video_poster_image_url:'Video poster link',
  display_format:'Display format', video_muted_by_default:'Video muted by default' };
const fields = {
  sponsors:['name','enabled','logo_url'],
  campaigns:['name','sponsor_id','approved','enabled','start_at','end_at','platforms','placement','exam','module','exclusive','share_schedule','creative_overrides'],
  creatives:['name','campaign_id','approved','enabled','start_at','end_at','platforms','rotation_weight','eyebrow_text','headline','body_text','cta_text','click_url','disclaimer_text','display_format','media_type','image_url','video_url','video_poster_image_url','video_muted_by_default']
};
function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function notice(text, error = false) {
  clearTimeout(timer); $('notice').textContent = text; $('notice').hidden = false;
  $('notice').setAttribute('role', error ? 'alert' : 'status');
  timer = setTimeout(() => { $('notice').hidden = true; }, 5000);
}
function googleSignInMessage(error) {
  switch (error?.code) {
    case 'auth/popup-blocked':
      return 'Your browser blocked Google sign-in. Allow pop-ups for this site or request an email sign-in link below.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google sign-in was cancelled. Try again or request an email sign-in link below.';
    case 'auth/unauthorized-domain':
    case 'auth/operation-not-allowed':
      return 'Google sign-in needs to be configured for this website. Use an email sign-in link or contact your administrator.';
    case 'auth/network-request-failed':
      return 'Google sign-in could not connect. Check your connection and try again.';
    default:
      return 'Google sign-in could not finish. Try again or request an email sign-in link below.';
  }
}
