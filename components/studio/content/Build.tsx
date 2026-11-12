// Generated from the Daisy Studio design canvas by scripts/studio/html2jsx.py.
// Edit the copy here; regenerate only if the design changes wholesale.
// Images are pre-sized WebP in public/studio/img, laid out by the design's CSS.
/* eslint-disable @next/next/no-img-element */
import React from 'react';
import Link from 'next/link';
import BriefForm from '../BriefForm';

export default function BuildBody() {
  return (
<>
<div className="ds" style={{"background": "var(--page)", "color": "var(--ink-1)", "fontFamily": "var(--font-sans)"} as React.CSSProperties}>

<header style={{"borderBottom": "1px solid var(--border)"} as React.CSSProperties}>
<nav aria-label="Studio" style={{"maxWidth": "1200px", "margin": "0 auto", "padding": "16px 32px", "display": "flex", "flexWrap": "wrap", "alignItems": "center", "justifyContent": "space-between", "gap": "12px 24px"} as React.CSSProperties}>
<Link href="/studio" style={{"fontFamily": "var(--font-serif)", "fontSize": "24px", "lineHeight": "30px", "color": "var(--ink-1)", "textDecoration": "none"} as React.CSSProperties}>Daisy Studio</Link>
<div style={{"display": "flex", "flexWrap": "wrap", "alignItems": "center", "gap": "8px 24px"} as React.CSSProperties}>
<Link href="/studio" style={{"fontSize": "15px", "lineHeight": "20px", "color": "var(--ink-2)", "textDecoration": "none"} as React.CSSProperties}>Our apps</Link>
<Link href="/studio/partner" style={{"fontSize": "15px", "lineHeight": "20px", "color": "var(--ink-2)", "textDecoration": "none"} as React.CSSProperties}>Partner with us</Link>
<a className="ds-btn ds-btn--primary" href="#brief">Send your brief</a>
</div>
</nav>
</header>

<section style={{"maxWidth": "1200px", "margin": "0 auto", "padding": "80px 32px 80px", "display": "flex", "flexWrap": "wrap", "gap": "56px", "alignItems": "center"} as React.CSSProperties}>
<div style={{"flex": "3 1 560px", "minWidth": "0", "display": "flex", "flexDirection": "column", "gap": "24px"} as React.CSSProperties}>
<p className="ds-eyebrow" style={{"fontSize": "13px", "lineHeight": "16px"} as React.CSSProperties}>Build your app</p>
<h1 style={{"margin": "0", "fontFamily": "var(--font-serif)", "fontWeight": "400", "fontSize": "clamp(40px, 6vw, 72px)", "lineHeight": "1.05", "maxWidth": "16ch", "textWrap": "balance"} as React.CSSProperties}>Your own app, built by people who ship them.</h1>
<p style={{"margin": "0", "fontSize": "19px", "lineHeight": "30px", "color": "var(--ink-2)", "maxWidth": "640px"} as React.CSSProperties}>We build apps for clubs, fisheries, associations and small organisations: web, iPhone and Android from one codebase, in your colours and your words.</p>
<div style={{"display": "flex", "flexWrap": "wrap", "gap": "16px", "alignItems": "center", "paddingTop": "8px"} as React.CSSProperties}>
<a className="ds-btn ds-btn--primary" href="#brief">Send your brief</a>
<Link className="ds-btn ds-btn--text" href="/studio">See the apps we&apos;ve built</Link>
</div>
</div>
<figure style={{"flex": "0 1 280px", "minWidth": "0", "margin": "0", "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "12px"} as React.CSSProperties}>
<div className="ds-device ds-device--phone" style={{"width": "260px"} as React.CSSProperties}><img src="/studio/img/75181050f74f1c6faa0fa79a95b8bba8.webp" alt="Hungerford Fishery's members' app home screen" /></div>
<figcaption style={{"fontSize": "13px", "lineHeight": "18px", "color": "var(--ink-3)", "textAlign": "center"} as React.CSSProperties}>Built for a club: <Link href="/studio/hungerford-fishery" style={{"color": "var(--ink-3)"} as React.CSSProperties}>Hungerford Fishery</Link></figcaption>
</figure>
</section>

<section style={{"maxWidth": "1200px", "margin": "0 auto", "padding": "0 32px 96px", "display": "flex", "flexDirection": "column", "gap": "32px"} as React.CSSProperties}>
<div style={{"display": "flex", "flexDirection": "column", "gap": "8px"} as React.CSSProperties}>
<p className="ds-eyebrow">What we build</p>
<h2 style={{"margin": "0", "fontFamily": "var(--font-serif)", "fontWeight": "400", "fontSize": "38px", "lineHeight": "44px"} as React.CSSProperties}>Three kinds of app we know well</h2>
</div>
<div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit, minmax(min(320px, 100%), 1fr))", "gap": "20px"} as React.CSSProperties}>
<div style={{"background": "var(--card)", "border": "1px solid var(--border)", "borderTop": "6px solid var(--app-hungerford)", "borderRadius": "12px", "padding": "28px", "display": "flex", "flexDirection": "column", "gap": "12px"} as React.CSSProperties}>
<h3 style={{"margin": "0", "fontFamily": "var(--font-serif)", "fontSize": "23px", "lineHeight": "30px"} as React.CSSProperties}>Club and fishery apps</h3>
<p style={{"margin": "0", "fontSize": "16px", "lineHeight": "24px", "color": "var(--ink-2)"} as React.CSSProperties}>Members, beats, rules, catch returns, notices and a back office the committee can run. Hungerford Fishery&apos;s app is one.</p>
<Link className="ds-btn ds-btn--text" href="/studio/hungerford-fishery" style={{"alignSelf": "flex-start"} as React.CSSProperties}>Read the Hungerford case study</Link>
</div>
<div style={{"background": "var(--card)", "border": "1px solid var(--border)", "borderTop": "6px solid var(--app-rise)", "borderRadius": "12px", "padding": "28px", "display": "flex", "flexDirection": "column", "gap": "12px"} as React.CSSProperties}>
<h3 style={{"margin": "0", "fontFamily": "var(--font-serif)", "fontSize": "23px", "lineHeight": "30px"} as React.CSSProperties}>Outdoor and data-driven apps</h3>
<p style={{"margin": "0", "fontSize": "16px", "lineHeight": "24px", "color": "var(--ink-2)"} as React.CSSProperties}>Live conditions from public data: river gauges, weather, ocean and biodiversity records, turned into one plain answer.</p>
<Link className="ds-btn ds-btn--text" href="/studio/rise-daisy" style={{"alignSelf": "flex-start"} as React.CSSProperties}>Read the Rise Daisy case study</Link>
</div>
<div style={{"background": "var(--card)", "border": "1px solid var(--border)", "borderTop": "6px solid var(--app-godaisy)", "borderRadius": "12px", "padding": "28px", "display": "flex", "flexDirection": "column", "gap": "12px"} as React.CSSProperties}>
<h3 style={{"margin": "0", "fontFamily": "var(--font-serif)", "fontSize": "23px", "lineHeight": "30px"} as React.CSSProperties}>Branded versions of an app</h3>
<p style={{"margin": "0", "fontSize": "16px", "lineHeight": "24px", "color": "var(--ink-2)"} as React.CSSProperties}>One codebase, several apps with their own names, icons and colours. Go Daisy and Grow Daisy ship this way; so does Hungerford.</p>
<Link className="ds-btn ds-btn--text" href="/studio/go-daisy" style={{"alignSelf": "flex-start"} as React.CSSProperties}>Read the Go Daisy case study</Link>
</div>
</div>
</section>

<section aria-label="Proof" style={{"background": "var(--panel)"} as React.CSSProperties}>
<div style={{"maxWidth": "1200px", "margin": "0 auto", "padding": "64px 32px", "display": "flex", "flexWrap": "wrap", "gap": "32px", "alignItems": "center", "justifyContent": "space-between"} as React.CSSProperties}>
<div style={{"display": "flex", "flexDirection": "column", "gap": "6px", "flex": "1 1 360px", "minWidth": "0"} as React.CSSProperties}>
<p style={{"margin": "0", "fontFamily": "var(--font-serif)", "fontSize": "26px", "lineHeight": "34px"} as React.CSSProperties}>Seven apps live in the App Store, five on Google Play too.</p>
<p style={{"margin": "0", "fontSize": "15px", "lineHeight": "22px", "color": "var(--ink-3)"} as React.CSSProperties}>Download any of them and try it before you write to us.</p>
</div>
<div aria-hidden="true" style={{"display": "flex", "flexWrap": "wrap", "gap": "12px"} as React.CSSProperties}>
<img src="/studio/img/80d96310a8d6eb7a753cf1dd4b8e3d2f.webp" alt="" style={{"width": "56px", "height": "56px", "borderRadius": "14px", "border": "1px solid var(--border)", "background": "var(--card)"} as React.CSSProperties} loading="lazy" decoding="async" />
<img src="/studio/img/adfe740f91fb4492db0b5374fec97de9.webp" alt="" style={{"width": "56px", "height": "56px", "borderRadius": "14px", "border": "1px solid var(--border)", "background": "var(--card)"} as React.CSSProperties} loading="lazy" decoding="async" />
<img src="/studio/img/450f98912f3eaf0194a92ead6ce9a813.webp" alt="" style={{"width": "56px", "height": "56px", "borderRadius": "14px", "border": "1px solid var(--border)", "background": "var(--card)"} as React.CSSProperties} loading="lazy" decoding="async" />
<img src="/studio/img/0379e9047f14ba0fa2dbc4e05d25c366.webp" alt="" style={{"width": "56px", "height": "56px", "borderRadius": "14px", "border": "1px solid var(--border)", "background": "var(--card)"} as React.CSSProperties} loading="lazy" decoding="async" />
<img src="/studio/img/c3bc841d80a1a02ab2bbec250d95afa1.webp" alt="" style={{"width": "56px", "height": "56px", "borderRadius": "14px", "border": "1px solid var(--border)", "background": "var(--card)"} as React.CSSProperties} loading="lazy" decoding="async" />
<img src="/studio/img/bf87f94bfbe571f892e3c66b9fcf2fb1.webp" alt="" style={{"width": "56px", "height": "56px", "borderRadius": "14px", "border": "1px solid var(--border)", "background": "var(--card)"} as React.CSSProperties} loading="lazy" decoding="async" />
<img src="/studio/img/3eefe8e233f51bd6dc2161cb57705490.webp" alt="" style={{"width": "56px", "height": "56px", "borderRadius": "14px", "border": "1px solid var(--border)", "background": "var(--card)"} as React.CSSProperties} loading="lazy" decoding="async" />
</div>
</div>
</section>

<section style={{"maxWidth": "1200px", "margin": "0 auto", "padding": "96px 32px", "display": "flex", "flexDirection": "column", "gap": "32px"} as React.CSSProperties}>
<div style={{"display": "flex", "flexDirection": "column", "gap": "8px"} as React.CSSProperties}>
<p className="ds-eyebrow">How it works</p>
<h2 style={{"margin": "0", "fontFamily": "var(--font-serif)", "fontWeight": "400", "fontSize": "38px", "lineHeight": "44px"} as React.CSSProperties}>Three steps, and what you have at the end of each</h2>
</div>
<ol style={{"listStyle": "none", "margin": "0", "padding": "0", "display": "grid", "gridTemplateColumns": "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", "gap": "20px"} as React.CSSProperties}>
<li style={{"background": "var(--card)", "border": "1px solid var(--border)", "borderRadius": "12px", "padding": "28px", "display": "flex", "flexDirection": "column", "gap": "10px"} as React.CSSProperties}>
<span style={{"fontFamily": "var(--font-serif)", "fontWeight": "700", "fontSize": "40px", "lineHeight": "44px", "color": "var(--moss-ink)"} as React.CSSProperties}>1</span>
<h3 style={{"margin": "0", "fontFamily": "var(--font-serif)", "fontSize": "23px", "lineHeight": "30px"} as React.CSSProperties}>Brief and questionnaire</h3>
<p style={{"margin": "0", "fontSize": "16px", "lineHeight": "24px", "color": "var(--ink-2)"} as React.CSSProperties}>You tell us who it&apos;s for; one written questionnaire covers your brand, rules, content and data.</p>
<p style={{"margin": "0", "paddingTop": "10px", "borderTop": "1px solid var(--border)", "fontSize": "14px", "lineHeight": "20px", "color": "var(--ink-1)"} as React.CSSProperties}><strong>You get:</strong> a written plan and a timeline.</p>
</li>
<li style={{"background": "var(--card)", "border": "1px solid var(--border)", "borderRadius": "12px", "padding": "28px", "display": "flex", "flexDirection": "column", "gap": "10px"} as React.CSSProperties}>
<span style={{"fontFamily": "var(--font-serif)", "fontWeight": "700", "fontSize": "40px", "lineHeight": "44px", "color": "var(--moss-ink)"} as React.CSSProperties}>2</span>
<h3 style={{"margin": "0", "fontFamily": "var(--font-serif)", "fontSize": "23px", "lineHeight": "30px"} as React.CSSProperties}>Build and test</h3>
<p style={{"margin": "0", "fontSize": "16px", "lineHeight": "24px", "color": "var(--ink-2)"} as React.CSSProperties}>We build it in your colours and your words, and you try it on your own phone as it takes shape.</p>
<p style={{"margin": "0", "paddingTop": "10px", "borderTop": "1px solid var(--border)", "fontSize": "14px", "lineHeight": "20px", "color": "var(--ink-1)"} as React.CSSProperties}><strong>You get:</strong> a test version your committee can use.</p>
</li>
<li style={{"background": "var(--card)", "border": "1px solid var(--border)", "borderRadius": "12px", "padding": "28px", "display": "flex", "flexDirection": "column", "gap": "10px"} as React.CSSProperties}>
<span style={{"fontFamily": "var(--font-serif)", "fontWeight": "700", "fontSize": "40px", "lineHeight": "44px", "color": "var(--moss-ink)"} as React.CSSProperties}>3</span>
<h3 style={{"margin": "0", "fontFamily": "var(--font-serif)", "fontSize": "23px", "lineHeight": "30px"} as React.CSSProperties}>Launch and keep it running</h3>
<p style={{"margin": "0", "fontSize": "16px", "lineHeight": "24px", "color": "var(--ink-2)"} as React.CSSProperties}>We take it through App Store and Google Play review, then keep it updated.</p>
<p style={{"margin": "0", "paddingTop": "10px", "borderTop": "1px solid var(--border)", "fontSize": "14px", "lineHeight": "20px", "color": "var(--ink-1)"} as React.CSSProperties}><strong>You get:</strong> your app in the stores, in 6–10 weeks.</p>
</li>
</ol>
</section>

<section id="brief" style={{"borderTop": "1px solid var(--border)"} as React.CSSProperties}>
<div style={{"maxWidth": "1200px", "margin": "0 auto", "padding": "96px 32px", "display": "flex", "flexWrap": "wrap", "gap": "56px", "alignItems": "flex-start"} as React.CSSProperties}>
<div style={{"flex": "1 1 360px", "display": "flex", "flexDirection": "column", "gap": "16px", "minWidth": "0"} as React.CSSProperties}>
<p className="ds-eyebrow">Send your brief</p>
<h2 style={{"margin": "0", "fontFamily": "var(--font-serif)", "fontWeight": "400", "fontSize": "38px", "lineHeight": "44px"} as React.CSSProperties}>Tell us what you need</h2>
<p style={{"margin": "0", "fontSize": "16px", "lineHeight": "24px", "color": "var(--ink-2)"} as React.CSSProperties}>A few lines is plenty. We read every brief ourselves.</p>
<ol style={{"margin": "8px 0 0", "paddingLeft": "20px", "display": "flex", "flexDirection": "column", "gap": "8px", "fontSize": "15px", "lineHeight": "22px", "color": "var(--ink-2)"} as React.CSSProperties}>
<li>We read your brief and ask anything we need to know.</li>
<li>We send back how we&apos;d build it and how long it would take.</li>
<li>If it suits you, we start with the questionnaire.</li>
</ol>
</div>
<BriefForm />
</div>
</section>

<section style={{"maxWidth": "1200px", "margin": "0 auto", "padding": "0 32px 96px", "display": "flex", "flexDirection": "column", "gap": "16px"} as React.CSSProperties}>
<p className="ds-eyebrow">Questions</p>
<div style={{"display": "flex", "flexDirection": "column", "borderTop": "1px solid var(--border)", "maxWidth": "800px"} as React.CSSProperties}>
<details style={{"borderBottom": "1px solid var(--border)", "padding": "18px 0"} as React.CSSProperties}><summary style={{"cursor": "pointer", "fontFamily": "var(--font-serif)", "fontSize": "20px", "lineHeight": "28px"} as React.CSSProperties}>Which platforms do you build for?</summary><p style={{"margin": "10px 0 0", "fontSize": "16px", "lineHeight": "24px", "color": "var(--ink-2)"} as React.CSSProperties}>Web, iPhone and Android, from one codebase. You can start with one and add the others later.</p></details>
<details style={{"borderBottom": "1px solid var(--border)", "padding": "18px 0"} as React.CSSProperties}><summary style={{"cursor": "pointer", "fontFamily": "var(--font-serif)", "fontSize": "20px", "lineHeight": "28px"} as React.CSSProperties}>Can we change the content ourselves?</summary><p style={{"margin": "10px 0 0", "fontSize": "16px", "lineHeight": "24px", "color": "var(--ink-2)"} as React.CSSProperties}>In a club app like Hungerford&apos;s, the committee runs notices, rules and the season from its own back office, and changes reach members the same day.</p></details>
<details style={{"borderBottom": "1px solid var(--border)", "padding": "18px 0"} as React.CSSProperties}><summary style={{"cursor": "pointer", "fontFamily": "var(--font-serif)", "fontSize": "20px", "lineHeight": "28px"} as React.CSSProperties}>How long does it take?</summary><p style={{"margin": "10px 0 0", "fontSize": "16px", "lineHeight": "24px", "color": "var(--ink-2)"} as React.CSSProperties}>Typically 6–10 weeks, depending on how much of what you need already exists in our apps.</p></details>
</div>
</section>

<footer style={{"borderTop": "1px solid var(--border)"} as React.CSSProperties}>
<div style={{"maxWidth": "1200px", "margin": "0 auto", "padding": "32px", "display": "flex", "flexWrap": "wrap", "justifyContent": "space-between", "gap": "12px 24px", "fontSize": "13px", "lineHeight": "18px", "color": "var(--ink-3)"} as React.CSSProperties}>
<span>Daisy Studio, part of godaisy.io · Fly Industries Ltd</span>
<span><a href="https://godaisy.io/privacy" target="_blank" rel="noopener" style={{"color": "var(--ink-3)"} as React.CSSProperties}>Privacy</a> · <Link href="/studio/build" style={{"color": "var(--ink-3)"} as React.CSSProperties}>Contact</Link></span>
</div>
</footer>

</div>
</>
  );
}
