export default function decorate(block) {

    const autoplay = block.children[0];
    autoplay.classList.add('autoplay');
    const autoplayDelay = block.children[1];
    autoplayDelay.classList.add('autoplay-delay');
    const showNavigation = block.children[2];
    showNavigation.classList.add('show-navigation');
    const showPagination = block.children[3];
    showPagination.classList.add('show-pagination');
    const loop = block.children[4];
    loop.classList.add('loop');

    [...block.children].slice(5).forEach((item) => {
    item.classList.add('carousel-content');
    console.log('item', item);
  });
}