export default function HomepageBanner() {
  return (
    <header className="homepage-banner">
      <div className="homepage-banner__container">
        <img
          src="wotnow-horizontal.png"
          alt="WotNow Logo"
          className="homepage-banner__logo"
        />
     <div className="homepage-banner__text">
            <h1 className="homepage-banner__title">What's good, when?</h1>
            <p className="homepage-banner__subtitle">
              Live your best life, every day
            </p>
          </div>
      </div>
    </header>
  );
}