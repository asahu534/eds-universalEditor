async function loadSwiper() {
  if (window.Swiper) return;

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css';
  document.head.appendChild(css);

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function getCarouselConfig(block) {
  const autoplay = block.querySelector('.autoplay').textContent.trim() === 'true';
  const autoplayDelay = parseInt(block.querySelector('.autoplay-delay').textContent.trim(), 10);
  const showNavigation = block.querySelector('.show-navigation').textContent.trim() === 'true';
  const showPagination = block.querySelector('.show-pagination').textContent.trim() === 'true';
  return {
    autoplay,
    autoplayDelay,
    showNavigation,
    showPagination,
  };
}

function renderCarousel(block) {
  const {
    autoplay, autoplayDelay, showNavigation, showPagination,
  } = getCarouselConfig(block);
  const swiper = document.createElement('div');
  swiper.className = 'swiper';
  const wrapper = document.createElement('div');
  wrapper.className = 'swiper-wrapper';
  const slides = [...block.querySelectorAll('.carousel-content')];

  slides.forEach((slide) => {
    slide.classList.add('swiper-slide');
    wrapper.append(slide);
  });

  swiper.append(wrapper);

  if (showPagination) {
    const pagination = document.createElement('div');
    pagination.className = 'swiper-pagination';
    swiper.append(pagination);
  }
  if (showNavigation) {
    const prev = document.createElement('div');
    prev.className = 'swiper-button-prev';
    const next = document.createElement('div');
    next.className = 'swiper-button-next';
    swiper.append(prev, next);
  }
  block.replaceChildren(swiper);

  const swipe = new window.Swiper(swiper, {
    autoplay: autoplay
      ? {
        delay: autoplayDelay || 3000,
        disableOnInteraction: false,
      }
      : false,

    pagination: showPagination
      ? {
        el: swiper.querySelector('.swiper-pagination'),
        clickable: true,
      }
      : false,

    navigation: showNavigation
      ? {
        nextEl: swiper.querySelector('.swiper-button-next'),
        prevEl: swiper.querySelector('.swiper-button-prev'),
      }
      : false,
    slidesPerView: 1,
    spaceBetween: 16,
  });
  swipe.update();
}

export default async function decorate(block) {
  const autoplayElement = block.children[0];
  autoplayElement.classList.add('autoplay');
  const autoplayDelayElement = block.children[1];
  autoplayDelayElement.classList.add('autoplay-delay');
  const showNavigationElement = block.children[2];
  showNavigationElement.classList.add('show-navigation');
  const showPaginationElement = block.children[3];
  showPaginationElement.classList.add('show-pagination');

  [...block.children].slice(4).forEach((item) => {
    item.classList.add('carousel-content');
  });
  const carouselContent = block.querySelectorAll('.carousel-content');
  carouselContent.forEach((element) => {
    const carouselImage = element.children[0];
    carouselImage.classList.add('carousel-image');
  });

  await loadSwiper();
  renderCarousel(block);
}
