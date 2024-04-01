import GamePage from "./ui/GamePage";
import {getGame} from '@/entities/game/api/requests';
import {GetStaticPaths, GetStaticProps} from 'next';
import {IGame} from '@/entities/game/model/interfaces';

// const getStaticProps = (async (context) => {
//     const res = await getGame(context.params?.slug as string);
//     return { props: { game: res,  } }
// }) satisfies GetStaticProps<{
//     game: IGame
// }>
//
// const getStaticPaths: GetStaticPaths<{ slug: string }> = async () => ({
//     paths: [], //indicates that no page needs be created at build time
//     fallback: 'blocking' //indicates the type of fallback
// });

export {GamePage};
