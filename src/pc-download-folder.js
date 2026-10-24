// A deliberate new download recreates its destination. Loading a saved game
// keeps the player's folder deletion intact until that explicit action.
export function restorePcDownloadFolder(state){
 if(!state.fileSystem?.deletedFolders?.includes('downloads'))return state;
 return {...state,fileSystem:{...state.fileSystem,deletedFolders:state.fileSystem.deletedFolders.filter(id=>id!=='downloads')}};
}
