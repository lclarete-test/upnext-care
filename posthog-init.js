!function(t,e){var o,n,p,r;e.__SV||(window.posthog && window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}p||((p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",p.onerror=function(){p=null},(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r));var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],Object.defineProperty(u,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e}}),Object.defineProperty(u.people,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+".people (stub)"}}),o="gu mu yu bu ku init Qu Zu Wu Vu Yu el Gu ec zu lc uc cc hc dc vc capture getExtension Ju fu mc calculateEventProperties gc register register_once register_for_session unregister unregister_for_session wc Uu yc getFeatureFlag getFeatureFlagPayload getFeatureFlagResult getAllFeatureFlags isFeatureEnabled reloadFeatureFlags updateFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys onActiveMatchingSurveysChanged renderSurvey displaySurvey cancelPendingSurvey canRenderSurvey canRenderSurveyAsync kc identify setPersonProperties unsetPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset Sc shutdown setIdentity clearIdentity get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException addExceptionStep captureLog startExceptionAutocapture stopExceptionAutocapture loadToolbar get_property getSessionProperty bc rc createPersonProfile setInternalOrTestUser Cu xu opt_in_capturing opt_out_capturing $u has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing nc debug il Os getPageViewId captureTraceFeedback captureTraceMetric Nu".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
function cleanAnalyticsURLs(properties) {
    if (!properties || typeof properties !== 'object') return;
    for (const key of Object.keys(properties)) {
        if (key === '$set' || key === '$set_once') cleanAnalyticsURLs(properties[key]);
        else if (/url|referrer/i.test(key) && typeof properties[key] === 'string') {
            try { const url = new URL(properties[key]); properties[key] = url.origin + url.pathname; }
            catch (_) { delete properties[key]; }
        }
    }
}
function startSitePosthog() {
    if (window.__sitePosthogStarted) return;
    window.__sitePosthogStarted = true;
    window.posthog.init('phc_uJmTiphYaVy3wsgHA79AzV8H2Fh9VcZsFcDRaJbpYM7a', {
        api_host: 'https://us.i.posthog.com',
        defaults: '2026-05-30',
        person_profiles: 'identified_only',
        autocapture: false,
        capture_pageview: true,
        capture_pageleave: true,
        disable_session_recording: false,
        session_recording: { maskAllInputs: true },
        before_send: function(event) {
            if (event) { cleanAnalyticsURLs(event.properties);event.properties=event.properties||{};event.properties.site_name='upnext';try{event.properties.traffic_type=window.localStorage.getItem('upnext-analytics-internal')==='1'?'internal':'external';}catch(_){event.properties.traffic_type='external';} }
            return event;
        }
    });
}
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('input, textarea, select').forEach(function (element) {
        element.classList.add('ph-no-capture');
    });
});
startSitePosthog();
document.addEventListener('click', function(event) {
    const link = event.target.closest && event.target.closest('a[href]');
    if (!link || !window.__sitePosthogStarted) return;
    const url = new URL(link.href, location.href);
    if (url.origin === location.origin && url.pathname.startsWith('/learn/') && url.pathname !== '/learn/' && url.pathname !== '/learn/index.html') {
        window.posthog.capture('article_link_click', {article: url.pathname});
    } else if (url.origin === location.origin && /^\/(programs|healthy-routines|dpp)(\/|$)/.test(url.pathname)) {
        window.posthog.capture('program_link_click', {destination: url.pathname});
    }
});


// Product events only. No names, emails, survey/quiz answers, or health records.
(function () {
  'use strict';
  const safeGet = (kind, key) => { try { return window[kind].getItem(key); } catch (_) { return null; } };
  const safeSet = (kind, key, value) => { try { window[kind].setItem(key, value); } catch (_) {} };
  const allowed = new Set(['program_id','lesson_id','auth_method','route','first_completion']);
  let identified = null;
  function track(name, properties = {}) {
    try {
      if (!window.posthog || typeof window.posthog.capture !== 'function') return;
      const clean = {site_name:'upnext',analytics_version:'20261013',traffic_type:safeGet('localStorage','upnext-analytics-internal')==='1'?'internal':'external'};
      for (const key of Object.keys(properties)) if (allowed.has(key) && ['string','number','boolean'].includes(typeof properties[key])) clean[key]=properties[key];
      window.posthog.capture(name,clean);
    } catch (_) { /* Analytics must not interrupt login or learning. */ }
  }
  function identify(uid) {
    try { if (uid && uid!==identified && window.posthog?.identify) { window.posthog.identify('upnext:'+uid);identified=uid; } } catch (_) {}
  }
  function authenticated(uid) {
    identify(uid);
    const key='upnext-analytics-session:'+uid,now=Date.now(),last=Number(safeGet('localStorage',key)||0);
    if (!last || now-last>30*60*1000) track('learning_session_started',{program_id:'healthy_routines'});
    safeSet('localStorage',key,String(now));
  }
  function logout() { try { if(identified){window.posthog?.reset?.();identified=null;} } catch (_) {} }
  const once = new Set();
  function programViewed() {
    const path=location.pathname,route=location.hash.slice(1);if(route==='signup'&&!window.__upnextSignupViewed){window.__upnextSignupViewed=true;track('signup_opened',{program_id:'healthy_routines'});}
    if (path.startsWith('/healthy-routines') || (path.startsWith('/programs')&&['course','learning'].includes(route))) {
      const key=path+'#'+route;
      if (!once.has(key)) { once.add(key);track('program_viewed',{program_id:'healthy_routines',route:route||'landing'}); }
    }
  }
  window.UpNextAnalytics = {track,identify,authenticated,logout};
  document.addEventListener('DOMContentLoaded',programViewed);
  window.addEventListener('hashchange',programViewed);
  if (document.readyState!=='loading') programViewed();
})();
