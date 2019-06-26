import { Injectable } from '@nestjs/common';
import { Repository, RepositoryFactory } from 'mongo-nest';
import * as Panels from 'shared/models/tador/panels';
import { createServer, Socket } from 'net';
import { MPPanel, Panel } from 'shared/models/tador/panels';
import { UserService } from '../services/user.service';
import { ActionType, PanelType } from 'shared/models/tador/enum';

interface Action {
    type: ActionType;
    panelId: string;
    data: any;
}
interface RegisterData {
    panelType: PanelType;
    userMail: string;
}

@Injectable()
export class TadorService {
    panelRepo: Repository<Panel>;
    constructor(private repositoryFactory: RepositoryFactory, private userService: UserService) {
        this.panelRepo = this.repositoryFactory.getRepository<Panel>(Panel, 'tador');
        this.panelRepo.findMany().then(result => {
            if (result.length) {
                return;
            }
            const panels = Array(10)
                .fill(0)
                .map(
                    (_, i) =>
                        new MPPanel({
                            phoneNumber: '234234234234',
                            address: 'חולון 24',
                            name: 'בניין ' + i,
                            userId: '5d0b0e0c7b7e3c08d4a8bd04',
                        }),
                );
            this.panelRepo.saveOrUpdateMany(panels);
        });
        this.startListen();
    }
    statuses = {};

    addStatus(panel: Panel, type: ActionType) {
        if (!this.statuses[panel.phoneNumber]) {
            this.statuses[panel.phoneNumber] = [];
        }
        switch (type) {
            case ActionType.read: {
                // sent changes only.
                break;
            }
            case ActionType.readAll: {
                this.statuses[panel.phoneNumber].push({ type: ActionType.readAll });
                break;
            }
            case ActionType.writeAll: {
                this.statuses[panel.phoneNumber].push({ type: ActionType.writeAll });
                break;
            }
        }
    }

    startListen() {
        const port = 4000;
        const host = '0.0.0.0';
        const server = createServer();

        server.listen(port, host, () => {
            console.log('TCP Server is running on port ' + port + '.');
        });

        server.on('connection', sock => {
            console.log('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort);
            sock.on('data', msg => {
                const action: Action = JSON.parse(msg.toString('utf8'));
                console.log('DATA ' + sock.remoteAddress + ': ' + action);
                let result = '';
                switch (action.type) {
                    case ActionType.register:
                        return this.register(action, sock);
                    case ActionType.readAll:
                        return this.read(action, sock, 16);
                    case ActionType.read:
                        return this.read(action, sock, 1);
                    case ActionType.write:
                        return this.write(action, sock, 1);
                    case ActionType.writeAll:
                        return this.write(action, sock, 16);
                    case ActionType.status:
                        return this.getStatus(action, sock);
                }
                sock.write(result);
            });

            sock.on('close', () => {
                console.log('CLOSED: ' + sock.remoteAddress + ' ' + sock.remotePort);
            });
        });
    }

    private async register(action: Action, sock: Socket) {
        const data = action.data as RegisterData;
        const user = await this.userService.userRepo.findOne({ email: data.userMail });
        const panel = new Panels[data.panelType + 'Panel']({
            name: '',
            address: '',
            userId: user.id,
            phoneNumber: action.panelId,
        });
        const saveResult = await this.panelRepo.collection.insertOne(panel);
        sock.write(saveResult.result.ok.toString());
    }

    private async read(action: Action, sock: Socket, multiply = 1) {
        const panel = await this.panelRepo.findOne({ phoneNumber: action.panelId });
        const start = action.data.start * multiply;
        const length = action.data.length * multiply;
        sock.write(panel.dump().slice(start * multiply, start + length * multiply));
    }
    private async write(action: Action, sock: Socket, multiply = 1) {
        const panel = await this.panelRepo.findOne({ phoneNumber: action.panelId });
        const dump = panel.dump().split('');
        const start = action.data.start * multiply;
        const length = action.data.length * multiply;
        for (let i = start; i < start + length; i++) {
            dump[i] = action.data.data[i - length];
        }
        panel.reDump(dump.join(''));
        const saveResult = await this.panelRepo.saveOrUpdateOne(panel);
        sock.write(saveResult.result.ok.toString());
    }

    private getStatus(action: Action, sock: Socket) {
        const panelStatus = this.statuses[action.panelId];
        if (!panelStatus || !panelStatus.length) {
            return sock.write(0);
        }
        return sock.write(panelStatus.pop());
    }
}
