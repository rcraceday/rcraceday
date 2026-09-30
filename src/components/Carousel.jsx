import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { richTextToPlainText } from "@/app/lib/richText";
import "./carousel.css";

export default function Carousel({ brand, items, onOpenItem }) {
  const [index, setIndex] = useState(0);
  const list = Array.isArray(items) ? items : [];

  useEffect(() => {
    setIndex(0);
  }, [list.length]);

  if (list.length === 0) return null;

  const goPrev = (e) => {
    e?.stopPropagation?.();
    setIndex((i) => (i - 1 + list.length) % list.length);
  };
  const goNext = (e) => {
    e?.stopPropagation?.();
    setIndex((i) => (i + 1) % list.length);
  };

  const prevIndex = (index - 1 + list.length) % list.length;
  const nextIndex = (index + 1) % list.length;
  const showSides = list.length > 1;

  return (
    <div className="carousel-wrapper">
      <div className="carousel-mobile" onClick={showSides ? goNext : undefined}>
        <div className="carousel-card carousel-mobile-card">
          <NewsCard brand={brand} item={list[index]} onOpen={onOpenItem} />
        </div>
      </div>

      <div className="carousel-desktop">
        {showSides && (
          <div className="carousel-card ghost-left" onClick={goPrev}>
            <NewsCard brand={brand} item={list[prevIndex]} onOpen={onOpenItem} />
          </div>
        )}

        <div className="carousel-card center" onClick={showSides ? goNext : undefined}>
          <NewsCard brand={brand} item={list[index]} onOpen={onOpenItem} />
        </div>

        {showSides && (
          <div className="carousel-card ghost-right" onClick={goNext}>
            <NewsCard brand={brand} item={list[nextIndex]} onOpen={onOpenItem} />
          </div>
        )}
      </div>
    </div>
  );
}

function NewsCard({ item, onOpen }) {
  const excerpt = richTextToPlainText(item?.body).slice(0, 140);

  const open = (e) => {
    e.stopPropagation();
    onOpen?.(item);
  };

  return (
    <Card className="news-card">
      <div className="news-card-image">
        {item?.image_url ? (
          <>
            <img
              className="news-card-image-bg"
              src={item.image_url}
              alt=""
              aria-hidden="true"
            />
            <img className="news-card-image-fg" src={item.image_url} alt="" />
          </>
        ) : (
          <span>{item?.title || "News"}</span>
        )}
      </div>
      <div className="news-card-body">
        <h3 className="news-card-title">{item?.title}</h3>
        {excerpt ? <p className="news-card-excerpt">{excerpt}</p> : null}
        <button type="button" className="news-card-read-more" onClick={open}>
          Read more
        </button>
      </div>
    </Card>
  );
}
