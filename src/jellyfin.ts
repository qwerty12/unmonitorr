import express from 'express';
import { ParamsDictionary } from 'express-serve-static-core';

import type { Request, Response } from 'express';
import { unmonitorMovie } from './radarr.js';
import { unmonitorEpisode, getRootFolders } from './sonarr.js';

const { JELLYFIN_PORT = '9898' } = process.env;

export function startJellyfinUnmonitor() {
  // XXX: if the Webhook plugin shows the library name in the future, just use that instead (ideally, the plugin itself would let you choose the libraries to act on)
  getRootFolders().then(sonarrRootFolders => {
  console.log(
    `Unmonitoring for jellyfin on /jellyfin with port: ${JELLYFIN_PORT}`,
  );

  const app = express();

  app.post(
    '/jellyfin',
    express.json(),
    (
      req: Request<ParamsDictionary, unknown, JellyfinApiResponse>,
      res: Response,
    ) => {
      const { Item, Series } = req.body;

      if (Item.UserData.IsFavorite) {
        res.end();
        return;
      }

      switch (Item.Type) {
        case 'Episode': {
          const itemPath = Item.Path;
          const episodeSonarrId = Item.ProviderIds.sonarr;
          if ((Series.UserData.IsFavorite) || (!episodeSonarrId && !sonarrRootFolders.some(rootFolder => itemPath.startsWith(rootFolder)))) {
            res.end();
            return;
          }

          const episodeTvdbIds = [Item.ProviderIds.Tvdb];
          const seriesTitle = Series.OriginalTitle;

          void unmonitorEpisode({ episodeTvdbIds, seriesTitle, episodeSonarrId }, res);
          return;
        }
        case 'Movie': {
          const title = Item.OriginalTitle;
          const year = Item.ProductionYear;
          const movieTmdbIds = [Item.ProviderIds.Tmdb];

          void unmonitorMovie({ movieTmdbIds, title, year }, res);
          return;
        }
      }
    },
  );

  app.listen(parseInt(JELLYFIN_PORT, 10));
  })
}
