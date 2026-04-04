import { useState } from "react";
import Card from "@/components/ui/Card";
import "./carousel.css"; // ensure correct relative path

export default function Carousel({ brand, items }) {
  const [index, setIndex] = useState(0);

  const goPrev = () => setIndex((i) => (i - 1 + items.length) % items.length);
  const goNext = () => setIndex((i) => (i + 1) % items.length);

  const prevIndex = (index - 1 + items.length) % items.length;
  const nextIndex = (index + 1) % items.length;

  return (
    <div className="carousel-wrapper">
      {/* MOBILE */}
      <div className="carousel-mobile" onClick={goNext}>
        <div className="carousel-card carousel-mobile-card">
          <NewsCard brand={brand} item={items[index]} />
        </div>
      </div>

      {/* DESKTOP */}
      <div className="carousel-desktop">
        <div className="carousel-card ghost-left" onClick={goPrev}>
          <NewsCard brand={brand} item={items[prevIndex]} />
        </div>

        <div className="carousel-card center" onClick={goNext}>
          <NewsCard brand={brand} item={items[index]} />
        </div>

        <div className="carousel-card ghost-right" onClick={goNext}>
          <NewsCard brand={brand} item={items[nextIndex]} />
        </div>
      </div>
    </div>
  );
}

function NewsCard({ brand, item }) {
  return (
    <Card className="news-card" style={{ border: `2px solid ${brand}` }}>
      <div className="news-card-image">{item.title}</div>
      <div className="news-card-body">
        <div className="line short"></div>
        <div className="line full"></div>
        <div className="line medium"></div>
      </div>
    </Card>
  );
}
