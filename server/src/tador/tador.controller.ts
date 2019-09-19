import { Body, Controller, Get, Post, UseInterceptors } from '@nestjs/common';
import { TadorService } from './tador.service';
import { ReqUser } from '../decorators/user.decorator';
import { App, User } from 'shared/models';
import { Panel } from 'shared/models/tador/panels';
import { AuthorizeInterceptor } from '../middlewares/authorize.middleware';

@UseInterceptors(AuthorizeInterceptor)
@Controller('tador')
export class TadorController {
    static app = App.tador;
    constructor(private service: TadorService) {}

    @Get('initialData')
    async initialData(@ReqUser() user: User) {
        //Promise<Array<{ panel: Panel; dump: string }>> {
        const panels = await this.service.panelRepo.findMany({ userId: user.email });
        return panels.map(p => {
            const result = { panel: p, dump: new Panel(p).dump() };
            delete result.panel.settings;
            delete result.panel.contacts;
            return result;
        });
    }

    @Post('savePanel')
    async savePanel(@Body() panel: Panel): Promise<any> {
        return this.service.panelRepo.saveOrUpdateOne(panel);
    }

    @Post('status')
    async status(@Body() panel: Panel): Promise<any> {
        return this.service.addStatus(panel, panel.actionType);
    }
}
